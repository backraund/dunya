from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os, uuid, boto3, json
from botocore.client import Config

# ─── Config ─────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "dunya_jwt_secret_2024_xkj9")
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 60

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongodb:27017")
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
BUCKET_NAME = "dunya-images"

# ─── Rate Limiter ─────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/hour"])

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(title="Dünyam API v2")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Security ────────────────────────────────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# ─── DB & MinIO ──────────────────────────────────────────────────────────────
try:
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.dunya
    places_col = db.places
    users_col = db.users
    partner_requests_col = db.partner_requests
    bucket_col = db.bucket_list
    timeline_col = db.timeline
except Exception as e:
    print("MongoDB Error:", e)

try:
    s3_client = boto3.client(
        's3',
        endpoint_url=MINIO_ENDPOINT,
        aws_access_key_id=MINIO_ACCESS_KEY,
        aws_secret_access_key=MINIO_SECRET_KEY,
        config=Config(signature_version='s3v4')
    )
except Exception as e:
    print("MinIO Error:", e)

@app.on_event("startup")
async def startup_event():
    try:
        s3_client.head_bucket(Bucket=BUCKET_NAME)
    except:
        try:
            s3_client.create_bucket(Bucket=BUCKET_NAME)
            policy = {
                "Version": "2012-10-17",
                "Statement": [{"Effect": "Allow", "Principal": "*", "Action": "s3:GetObject", "Resource": f"arn:aws:s3:::{BUCKET_NAME}/*"}]
            }
            s3_client.put_bucket_policy(Bucket=BUCKET_NAME, Policy=json.dumps(policy))
        except Exception as e:
            print("Bucket error:", e)

# ─── Helpers ─────────────────────────────────────────────────────────────────
def clean_doc(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))

def create_token(username: str) -> str:
    expire = datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": username, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(status_code=401, detail="Giriş yapılmamış")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Geçersiz token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Geçersiz token")
    user = await users_col.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
    return user

async def log_timeline(username: str, action: str, detail: str, country_id: str = None, city: str = None, color: str = None):
    """Log an activity to the timeline."""
    await timeline_col.insert_one({
        "user_id": username,
        "action": action,
        "detail": detail,
        "country_id": country_id,
        "city": city,
        "color": color,
        "created_at": datetime.utcnow().isoformat(),
        "timestamp": datetime.utcnow(),
    })

# ─── AUTH ─────────────────────────────────────────────────────────────────────
@app.post("/api/auth/register")
@limiter.limit("10/hour")
async def register(
    request: Request,
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    display_name: str = Form(None),
):
    username = username.lower().strip()
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Kullanıcı adı en az 3 karakter olmalı")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Şifre en az 6 karakter olmalı")
    if await users_col.find_one({"username": username}):
        raise HTTPException(status_code=400, detail="Bu kullanıcı adı alınmış")
    if await users_col.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı")

    user_doc = {
        "username": username,
        "email": email,
        "password_hash": hash_password(password),
        "display_name": display_name or username,
        "created_at": datetime.utcnow().isoformat(),
        "partner": None,
        "last_seen": datetime.utcnow().isoformat(),
    }
    await users_col.insert_one(user_doc)
    token = create_token(username)
    return {
        "token": token,
        "username": username,
        "display_name": display_name or username,
        "email": email,
        "partner": None,
    }

@app.post("/api/auth/login")
@limiter.limit("20/hour")
async def login(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
):
    username = username.lower().strip()
    user = await users_col.find_one({"username": username})
    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Kullanıcı adı veya şifre hatalı")
    # Update last seen
    await users_col.update_one({"username": username}, {"$set": {"last_seen": datetime.utcnow().isoformat()}})
    token = create_token(username)
    return {
        "token": token,
        "username": username,
        "display_name": user.get("display_name", username),
        "email": user.get("email", ""),
        "partner": user.get("partner"),
    }

@app.get("/api/auth/me")
async def me(current_user=Depends(get_current_user)):
    return {
        "username": current_user["username"],
        "display_name": current_user.get("display_name", current_user["username"]),
        "email": current_user.get("email", ""),
        "partner": current_user.get("partner"),
        "created_at": current_user.get("created_at"),
    }

@app.patch("/api/auth/me")
async def update_profile(
    display_name: str = Form(None),
    current_user=Depends(get_current_user),
):
    update = {}
    if display_name:
        update["display_name"] = display_name
    if update:
        await users_col.update_one({"username": current_user["username"]}, {"$set": update})
    return {"message": "Profil güncellendi"}

# ─── PLACES ──────────────────────────────────────────────────────────────────
@app.get("/api/places")
async def get_places(
    include_partner: bool = False,
    current_user=Depends(get_current_user),
):
    username = current_user["username"]
    places = await places_col.find({"user_id": username}).to_list(2000)
    for p in places:
        clean_doc(p)
        p["from_partner"] = False

    if include_partner and current_user.get("partner"):
        partner_places = await places_col.find({"user_id": current_user["partner"]}).to_list(2000)
        for p in partner_places:
            clean_doc(p)
            p["from_partner"] = True
        places = places + partner_places

    return places

@app.post("/api/places")
@limiter.limit("60/hour")
async def create_place(
    request: Request,
    country_id: str = Form(...),
    country_name: str = Form(...),
    city: str = Form(None),
    lat: float = Form(None),
    lng: float = Form(None),
    color: str = Form(...),
    note: str = Form(None),
    visited_date: str = Form(None),
    imageUrl: str = Form(None),
    file: UploadFile = File(None),
    current_user=Depends(get_current_user),
):
    image_url = imageUrl

    # Upload to MinIO (prefer file over base64)
    if file and file.filename:
        try:
            file_ext = file.filename.split(".")[-1]
            file_name = f"{current_user['username']}/{uuid.uuid4()}.{file_ext}"
            s3_client.upload_fileobj(
                file.file, BUCKET_NAME, file_name,
                ExtraArgs={"ContentType": file.content_type}
            )
            # Use public-facing URL via nginx proxy
            minio_public = os.getenv("MINIO_PUBLIC_URL", MINIO_ENDPOINT)
            image_url = f"{minio_public}/{BUCKET_NAME}/{file_name}"
        except Exception as e:
            print("MinIO error:", e)
            # Fall back to base64 if provided

    now = datetime.utcnow().isoformat()
    place_doc = {
        "user_id": current_user["username"],
        "country_id": country_id,
        "country_name": country_name,
        "city": city,
        "lat": lat,
        "lng": lng,
        "color": color,
        "imageUrl": image_url,
        "note": note,
        "visited_date": visited_date or now[:10],
        "created_at": now,
    }
    result = await places_col.insert_one(place_doc)
    place_doc["id"] = str(result.inserted_id)
    del place_doc["_id"]
    place_doc["from_partner"] = False

    # Log to timeline
    await log_timeline(
        current_user["username"],
        "place_added",
        f"{city or country_name} ziyaret edildi",
        country_id=country_id,
        city=city,
        color=color,
    )

    return place_doc

# ─── BUCKET LIST ──────────────────────────────────────────────────────────────
@app.get("/api/bucket")
async def get_bucket(current_user=Depends(get_current_user)):
    items = await bucket_col.find({"user_id": current_user["username"]}).to_list(500)
    for item in items:
        clean_doc(item)
    return items

@app.post("/api/bucket")
@limiter.limit("30/hour")
async def add_bucket(
    request: Request,
    country_id: str = Form(...),
    country_name: str = Form(...),
    city: str = Form(None),
    note: str = Form(None),
    current_user=Depends(get_current_user),
):
    # Check not already a visited place
    existing = await bucket_col.find_one({
        "user_id": current_user["username"],
        "country_id": country_id,
        "city": city,
    })
    if existing:
        raise HTTPException(status_code=400, detail="Zaten listede var")

    doc = {
        "user_id": current_user["username"],
        "country_id": country_id,
        "country_name": country_name,
        "city": city,
        "note": note,
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await bucket_col.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    del doc["_id"]
    return doc

@app.delete("/api/bucket/{item_id}")
async def remove_bucket(item_id: str, current_user=Depends(get_current_user)):
    from bson import ObjectId
    result = await bucket_col.delete_one({
        "_id": ObjectId(item_id),
        "user_id": current_user["username"],
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bulunamadı")
    return {"message": "Silindi"}

# ─── TIMELINE ─────────────────────────────────────────────────────────────────
@app.get("/api/timeline")
async def get_timeline(
    include_partner: bool = False,
    limit: int = 50,
    current_user=Depends(get_current_user),
):
    username = current_user["username"]
    query = {"user_id": username}

    if include_partner and current_user.get("partner"):
        query = {"user_id": {"$in": [username, current_user["partner"]]}}

    events = await timeline_col.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    for e in events:
        clean_doc(e)
        e.pop("timestamp", None)  # Remove non-serializable timestamp field
    return events

@app.get("/api/notifications")
async def get_notifications(current_user=Depends(get_current_user)):
    """What happened since last login."""
    partner = current_user.get("partner")
    if not partner:
        return []

    # Get partner's last seen
    partner_user = await users_col.find_one({"username": partner})
    my_last_seen = current_user.get("last_seen", "2000-01-01")

    events = await timeline_col.find({
        "user_id": partner,
        "created_at": {"$gt": my_last_seen},
    }).sort("timestamp", -1).limit(20).to_list(20)
    for e in events:
        clean_doc(e)
        e.pop("timestamp", None)
    return events

# ─── STATS ───────────────────────────────────────────────────────────────────
@app.get("/api/stats")
async def get_stats(current_user=Depends(get_current_user)):
    username = current_user["username"]
    places = await places_col.find({"user_id": username}).to_list(2000)

    countries = set(p["country_id"] for p in places)
    cities = set(f"{p['country_id']}:{p.get('city','')}" for p in places)
    photos = sum(1 for p in places if p.get("imageUrl"))
    total_world_countries = 195

    return {
        "countries_count": len(countries),
        "cities_count": len(cities),
        "photos_count": photos,
        "places_count": len(places),
        "world_pct": round(len(countries) / total_world_countries * 100, 1),
        "most_visited_country": max(
            countries,
            key=lambda c: sum(1 for p in places if p["country_id"] == c),
            default=None
        ),
    }

# ─── PARTNERS ─────────────────────────────────────────────────────────────────
@app.post("/api/partners/request/{to_username}")
@limiter.limit("10/hour")
async def send_partner_request(request: Request, to_username: str, current_user=Depends(get_current_user)):
    to_username = to_username.lower().strip()
    if to_username == current_user["username"]:
        raise HTTPException(status_code=400, detail="Kendinize istek gönderemezsiniz")

    to_user = await users_col.find_one({"username": to_username})
    if not to_user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    existing = await partner_requests_col.find_one({
        "from_user": current_user["username"],
        "to_user": to_username,
        "status": "pending",
    })
    if existing:
        raise HTTPException(status_code=400, detail="Zaten istek gönderildi")

    await partner_requests_col.insert_one({
        "from_user": current_user["username"],
        "to_user": to_username,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
    })
    return {"message": f"@{to_username} kullanıcısına istek gönderildi!"}

@app.get("/api/partners/requests")
async def get_partner_requests(current_user=Depends(get_current_user)):
    requests = await partner_requests_col.find({
        "to_user": current_user["username"],
        "status": "pending",
    }).to_list(50)
    for r in requests:
        clean_doc(r)
    return requests

@app.post("/api/partners/accept/{from_username}")
async def accept_partner_request(from_username: str, current_user=Depends(get_current_user)):
    request = await partner_requests_col.find_one({
        "from_user": from_username,
        "to_user": current_user["username"],
        "status": "pending",
    })
    if not request:
        raise HTTPException(status_code=404, detail="İstek bulunamadı")

    await users_col.update_one({"username": current_user["username"]}, {"$set": {"partner": from_username}})
    await users_col.update_one({"username": from_username}, {"$set": {"partner": current_user["username"]}})
    await partner_requests_col.update_one({"_id": request["_id"]}, {"$set": {"status": "accepted"}})
    return {"message": f"@{from_username} ile eşleşildi! 🎉"}

@app.delete("/api/partners")
async def remove_partner(current_user=Depends(get_current_user)):
    partner = current_user.get("partner")
    if not partner:
        raise HTTPException(status_code=400, detail="Aktif eşleşme yok")
    await users_col.update_one({"username": current_user["username"]}, {"$set": {"partner": None}})
    await users_col.update_one({"username": partner}, {"$set": {"partner": None}})
    return {"message": "Eşleşme kaldırıldı"}

@app.get("/")
def read_root():
    return {"message": "Dünyam API v2.0 — Multi-User + Timeline + Bucket List"}
