from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
from api.dependencies import get_current_admin_user
from models.user import User
from services.notification_service import send_email, send_push_notification

router = APIRouter()

class SendEmailRequest(BaseModel):
    to_email: EmailStr
    subject: str
    content: str

class SendPushRequest(BaseModel):
    device_token: str
    title: str
    body: str

@router.post("/manual/email")
async def manual_email(
    payload: SendEmailRequest,
    current_admin: User = Depends(get_current_admin_user)
):
    success = await send_email(payload.to_email, payload.subject, payload.content)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email")
    return {"message": "Email sent successfully"}

@router.post("/manual/push")
async def manual_push(
    payload: SendPushRequest,
    current_admin: User = Depends(get_current_admin_user)
):
    success = await send_push_notification(payload.device_token, payload.title, payload.body)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send push notification. Ensure Firebase is configured.")
    return {"message": "Push notification sent successfully"}
