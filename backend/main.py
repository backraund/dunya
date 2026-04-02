from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
import boto3
from botocore.client import Config

app = FastAPI(title="Dünyam Harita API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Çevresel Değişkenler
MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongodb:27017")
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "test")
BUCKET_NAME = "dunya-images"

# DB ve MinIO
try:
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.dunya
    places_collection = db.places
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
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": "*",
                        "Action": "s3:GetObject",
                        "Resource": f"arn:aws:s3:::{BUCKET_NAME}/*"
                    }
                ]
            }
            import json
            s3_client.put_bucket_policy(Bucket=BUCKET_NAME, Policy=json.dumps(policy))
        except Exception as e:
            print("Bucket Creation Error:", e)

class PlaceResponse(BaseModel):
    id: str
    country_id: str
    country_name: str
    city: str | None = None
    lat: float | None = None
    lng: float | None = None
    color: str
    imageUrl: str | None = None
    note: str | None = None

@app.get("/api/places")
async def get_places():
    places = await places_collection.find().to_list(1000)
    for p in places:
        if "_id" in p:
            p["id"] = str(p["_id"])
            del p["_id"]
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
    password: str = Form(...),
    file: UploadFile = File(None)
):
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Hatalı Şifre! Sadece yetkili kişi yer ekleyebilir.")

    image_url = None
    if file and file.filename:
        file_ext = file.filename.split(".")[-1]
        file_name = f"{uuid.uuid4()}.{file_ext}"
        s3_client.upload_fileobj(
            file.file, 
            BUCKET_NAME, 
            file_name,
            ExtraArgs={"ContentType": file.content_type}
        )
        # Eğer Docker ile localde test ediyorken resmi dışarıdan görüntülemek gerekirse diye:
        image_url = f"{MINIO_ENDPOINT}/{BUCKET_NAME}/{file_name}"
        
    place_doc = {
        "country_id": country_id,
        "country_name": country_name,
        "city": city,
        "lat": lat,
        "lng": lng,
        "color": color,
        "imageUrl": image_url,
        "note": note
    }
    
    result = await places_collection.insert_one(place_doc)
    place_doc["id"] = str(result.inserted_id)
    return place_doc

@app.get("/")
def read_root():
    return {"message": "Dunya API Aktif. Sifre Korumasi Eklendi."}
