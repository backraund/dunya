from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
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

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(title="Dünyam API v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Security ────────────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# ─── DB & MinIO ──────────────────────────────────────────────────────────────
try:
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.dunya
    places_col = db.places
    users_col = db.users
    partner_requests_col = db.partner_requests
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
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

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

# ─── AUTH ─────────────────────────────────────────────────────────────────────
@app.post("/api/auth/register")
async def register(
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
async def login(
    username: str = Form(...),
    password: str = Form(...),
):
    username = username.lower().strip()
    user = await users_col.find_one({"username": username})
    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Kullanıcı adı veya şifre hatalı")
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
    }

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
async def create_place(
    country_id: str = Form(...),
    country_name: str = Form(...),
    city: str = Form(None),
    lat: float = Form(None),
    lng: float = Form(None),
    color: str = Form(...),
    note: str = Form(None),
    imageUrl: str = Form(None),
    file: UploadFile = File(None),
    current_user=Depends(get_current_user),
):
    image_url = imageUrl
    if file and file.filename:
        try:
            file_ext = file.filename.split(".")[-1]
            file_name = f"{uuid.uuid4()}.{file_ext}"
            s3_client.upload_fileobj(
                file.file, BUCKET_NAME, file_name,
                ExtraArgs={"ContentType": file.content_type}
            )
            image_url = f"{MINIO_ENDPOINT}/{BUCKET_NAME}/{file_name}"
        except Exception as e:
            print("MinIO error:", e)

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
    }
    result = await places_col.insert_one(place_doc)
    place_doc["id"] = str(result.inserted_id)
    del place_doc["_id"]
    place_doc["from_partner"] = False
    return place_doc

# ─── PARTNERS ─────────────────────────────────────────────────────────────────
@app.post("/api/partners/request/{to_username}")
async def send_partner_request(to_username: str, current_user=Depends(get_current_user)):
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
    return {"message": "Dünyam API v2 — Multi-User Edition"}
