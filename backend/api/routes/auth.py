from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from datetime import datetime, timedelta

from core.config import settings
from core.security import create_access_token, verify_password, get_password_hash
from db.session import get_session
from models.user import User, UserRead, UserCreate
from models.otp import OTP, OTPVerify
from services.email_service import send_otp_email, generate_otp, send_welcome_email

router = APIRouter()

@router.post("/login")
async def login_access_token(
    db: AsyncSession = Depends(get_session),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    elif not user.is_verified and not user.is_admin:
        raise HTTPException(status_code=400, detail="Email not verified. Please check your inbox for the OTP.")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(user.id, expires_delta=access_token_expires),
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "is_admin": user.is_admin,
            "is_core_member": user.is_core_member,
            "is_verified": user.is_verified,
            "college_name": user.college_name,
            "department": user.department,
            "year": user.year,
            "semester": user.semester,
            "favorite_subjects": user.favorite_subjects,
            "cgpa": user.cgpa,
            "is_identity_verified": user.is_identity_verified,
            "verification_status": user.verification_status,
            "verification_document_type": user.verification_document_type,
            "id_card_path": user.id_card_path,
            "profile_image_path": user.profile_image_path,
        }
    }

@router.post("/register")
async def register_user(user_in: UserCreate, db: AsyncSession = Depends(get_session)) -> Any:
    result = await db.execute(select(User).where(User.email == user_in.email))
    existing = result.scalar_one_or_none()
    
    if existing:
        if existing.is_verified:
            raise HTTPException(status_code=400, detail="A user with this email already exists and is verified.")
        # User exists but is NOT verified. Update their info (maybe they made a typo) and resend OTP.
        existing.full_name = user_in.full_name
        existing.hashed_password = get_password_hash(user_in.password)
        db.add(existing)
        message = "User already exists but is unverified. A new OTP has been sent to your email."
    else:
        # Create user with is_verified=False
        existing = User(
            email=user_in.email,
            hashed_password=get_password_hash(user_in.password),
            full_name=user_in.full_name,
            is_active=True,
            is_admin=False,
            is_verified=False,
        )
        db.add(existing)
        message = "Registration successful. Check your email for the OTP to verify your account."
    
    await db.commit()
    await db.refresh(existing)

    # Send OTP
    otp_code = generate_otp()
    otp = OTP(
        email=existing.email,
        otp_code=otp_code,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(otp)
    await db.commit()
    await send_otp_email(existing.email, otp_code, purpose="registration")

    return {"message": message}

@router.post("/verify-otp")
async def verify_otp(payload: OTPVerify, db: AsyncSession = Depends(get_session)) -> Any:
    # Get latest unused OTP for this email
    result = await db.execute(
        select(OTP)
        .where(OTP.email == payload.email, OTP.is_used == False)
        .order_by(OTP.expires_at.desc())
    )
    otp_record = result.scalars().first()
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="No OTP found for this email.")
    if otp_record.otp_code != payload.otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP.")
    if otp_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired. Please register again.")
    
    # Mark OTP as used
    otp_record.is_used = True
    db.add(otp_record)
    
    # Mark user as verified
    user_result = await db.execute(select(User).where(User.email == payload.email))
    user = user_result.scalar_one_or_none()
    if user:
        user.is_verified = True
        db.add(user)
        # Send welcome email
        await send_welcome_email(user.email, user.full_name or "Student")
    
    await db.commit()
    return {"message": "Email verified successfully! You can now log in."}

@router.post("/resend-otp")
async def resend_otp(email: str, db: AsyncSession = Depends(get_session)) -> Any:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="User already verified.")
    
    otp_code = generate_otp()
    otp = OTP(
        email=email,
        otp_code=otp_code,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(otp)
    await db.commit()
    await send_otp_email(email, otp_code, purpose="registration")
    return {"message": "OTP resent successfully."}
