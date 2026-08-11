from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone

try:
    import resend
except ImportError:
    resend = None

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class ContactMessage(BaseModel):
    nama: str = Field(min_length=2, max_length=120)
    perusahaan: str = Field(min_length=2, max_length=160)
    email: EmailStr
    telepon: Optional[str] = Field(default=None, max_length=30)
    pesan: str = Field(min_length=5, max_length=4000)


@api_router.get("/")
async def root():
    return {"message": "PATSI.ID API"}


@api_router.post("/contact")
async def submit_contact(input: ContactMessage):
    doc = input.model_dump()
    doc['id'] = str(uuid.uuid4())
    doc['created_at'] = datetime.now(timezone.utc).isoformat()
    doc['email_sent'] = False
    await db.contact_messages.insert_one(doc)

    email_sent = False
    resend_key = os.environ.get('RESEND_API_KEY')
    recipient = os.environ.get('CONTACT_RECIPIENT')
    sender = os.environ.get('SENDER_EMAIL')

    if resend and resend_key and recipient and sender:
        resend.api_key = resend_key
        html = f"""
        <table style="font-family:Arial,sans-serif;font-size:14px;color:#14213D" cellpadding="8">
          <tr><td><b>Nama</b></td><td>{input.nama}</td></tr>
          <tr><td><b>Perusahaan</b></td><td>{input.perusahaan}</td></tr>
          <tr><td><b>Email</b></td><td>{input.email}</td></tr>
          <tr><td><b>Telepon</b></td><td>{input.telepon or '-'}</td></tr>
          <tr><td><b>Pesan</b></td><td>{input.pesan}</td></tr>
        </table>
        """
        params = {
            "from": sender,
            "to": [recipient],
            "subject": f"Pesan Baru dari {input.nama} — {input.perusahaan}",
            "html": html,
            "reply_to": input.email,
        }
        try:
            await asyncio.to_thread(resend.Emails.send, params)
            email_sent = True
            await db.contact_messages.update_one({"id": doc["id"]}, {"$set": {"email_sent": True}})
        except Exception as e:
            logger.error(f"Failed to send contact email: {str(e)}")
    else:
        logger.warning("Resend not configured; contact message stored without email delivery.")

    return {"status": "success", "message": "Pesan Anda telah kami terima.", "email_sent": email_sent}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
