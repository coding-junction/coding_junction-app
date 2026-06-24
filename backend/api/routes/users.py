from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import List
import uuid
import os

from api.dependencies import get_current_admin_user, get_current_active_user
from db.session import get_session
from models.user import User, UserRead, UserUpdate
from core.security import verify_password, get_password_hash
from services.email_service import send_otp_email, generate_otp, send_role_change_email
from models.otp import OTP
from datetime import datetime, timedelta
from services.media_service import upload_profile_image as cloudinary_upload_profile, upload_verification_doc as cloudinary_upload_doc

router = APIRouter()

@router.get("/me", response_model=UserRead)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.patch("/me", response_model=UserRead)
async def update_user_me(
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    update_data = user_in.model_dump(exclude_unset=True)
    # Don't allow email/password change via this endpoint
    update_data.pop("email", None)
    update_data.pop("password", None)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user

@router.post("/me/upload-id")
async def upload_id_card(
    document_type: str = Form("id_card"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Student uploads their college ID card or fee receipt for verification."""
    try:
        secure_url = await cloudinary_upload_doc(file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload document to Cloudinary: {str(e)}")
        
    current_user.id_card_path = secure_url
    current_user.verification_document_type = document_type
    current_user.verification_status = "pending"
    db.add(current_user)
    await db.commit()
    
    return {"message": "Document uploaded successfully. Waiting for admin approval."}

@router.post("/me/upload-profile-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """User uploads a profile image."""
    try:
        secure_url = await cloudinary_upload_profile(file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image to Cloudinary: {str(e)}")
        
    current_user.profile_image_path = secure_url
    db.add(current_user)
    await db.commit()
    
    return {"message": "Profile image uploaded successfully."}

@router.post("/me/request-email-otp")
async def request_email_change_otp(
    new_email: str,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Request OTP to change email."""
    # Check if new email is already in use
    result = await db.execute(select(User).where(User.email == new_email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already in use")
    
    otp_code = generate_otp()
    otp = OTP(
        email=new_email,
        otp_code=otp_code,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(otp)
    await db.commit()
    
    await send_otp_email(new_email, otp_code, purpose="email_change")
    
    return {"message": "OTP sent to new email address"}

@router.post("/me/verify-email-change")
async def verify_email_change(
    new_email: str,
    otp_code: str,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Verify OTP and change email."""
    result = await db.execute(
        select(OTP)
        .where(OTP.email == new_email, OTP.is_used == False)
        .order_by(OTP.expires_at.desc())
    )
    otp_record = result.scalars().first()
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="No OTP found for this email.")
    if otp_record.otp_code != otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP.")
    if otp_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired.")
    
    # Mark OTP as used
    otp_record.is_used = True
    db.add(otp_record)
    
    # Update email
    current_user.email = new_email
    db.add(current_user)
    await db.commit()
    
    return {"message": "Email changed successfully"}

@router.post("/me/request-password-otp")
async def request_password_change_otp(
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Request OTP to change password."""
    otp_code = generate_otp()
    otp = OTP(
        email=current_user.email,
        otp_code=otp_code,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(otp)
    await db.commit()
    
    await send_otp_email(current_user.email, otp_code, purpose="password_change")
    
    return {"message": "OTP sent to your email"}

@router.post("/me/change-password")
async def change_password(
    current_password: str,
    new_password: str,
    otp_code: str,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Verify current password and OTP, then change password."""
    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    
    # Verify OTP for email
    result = await db.execute(
        select(OTP)
        .where(OTP.email == current_user.email, OTP.is_used == False)
        .order_by(OTP.expires_at.desc())
    )
    otp_record = result.scalars().first()
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="No OTP found. Request one first.")
    if otp_record.otp_code != otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP.")
    if otp_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired.")
    
    # Mark OTP as used
    otp_record.is_used = True
    db.add(otp_record)
    
    # Update password
    current_user.hashed_password = get_password_hash(new_password)
    db.add(current_user)
    await db.commit()
    
    return {"message": "Password changed successfully"}

@router.post("/me/fcm-token")
async def update_fcm_token(
    token: str,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Save the device's FCM push token for the current user."""
    current_user.fcm_token = token
    db.add(current_user)
    await db.commit()
    return {"status": "ok"}

@router.get("/", response_model=List[UserRead])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_session),
    current_admin: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(User).offset(skip).limit(limit))
    users = result.scalars().all()
    return users

@router.get("/pending-verification", response_model=List[UserRead])
async def pending_verification(
    db: AsyncSession = Depends(get_session),
    current_admin: User = Depends(get_current_admin_user)
):
    """List users who have uploaded an ID card but are not yet verified."""
    result = await db.execute(
        select(User).where(User.verification_status == "pending")
    )
    return result.scalars().all()

@router.get("/{user_id}", response_model=UserRead)
async def get_user_detail(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_admin: User = Depends(get_current_admin_user)
):
    """Admin read-only view of a single user's full profile."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/{user_id}/assign-role", response_model=UserRead)
async def assign_role(
    user_id: uuid.UUID,
    role: str,
    db: AsyncSession = Depends(get_session),
    current_admin: User = Depends(get_current_admin_user)
):
    """Admin assigns role to user: admin, core_member, or student."""
    if user_id == current_admin.id:
        raise HTTPException(status_code=403, detail="You cannot change your own role.")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if role == "admin":
        user.is_admin = True
        user.is_core_member = False
        user.is_identity_verified = True
        user.verification_status = "verified"
    elif role == "core_member":
        user.is_admin = False
        user.is_core_member = True
        user.is_identity_verified = True
        user.verification_status = "verified"
    elif role == "student":
        user.is_admin = False
        user.is_core_member = False
    else:
        raise HTTPException(status_code=400, detail="Invalid role. Must be admin, core_member, or student.")
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    # Send role change notification email
    await send_role_change_email(
        email_to=user.email,
        target_name=user.full_name or "Student",
        new_role=role,
        admin_name=current_admin.full_name or "Administrator"
    )
    
    return user

@router.post("/{user_id}/promote", response_model=UserRead)
async def promote_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_admin: User = Depends(get_current_admin_user)
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=403, detail="You cannot change your own admin status.")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_admin = True
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/{user_id}/demote", response_model=UserRead)
async def demote_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_admin: User = Depends(get_current_admin_user)
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=403, detail="You cannot change your own admin status.")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_admin = False
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/{user_id}/verify", response_model=UserRead)
async def verify_user_identity(
    user_id: uuid.UUID,
    action: str = Form(...), # "approve" or "reject"
    role: str = Form("student"), # "student", "core_member", or "admin"
    db: AsyncSession = Depends(get_session),
    current_admin: User = Depends(get_current_admin_user)
):
    """Admin approves or rejects a student's identity verification."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if action == "approve":
        user.verification_status = "verified"
        user.is_identity_verified = True
        if role == "admin":
            user.is_admin = True
            user.is_core_member = False
        elif role == "core_member":
            user.is_admin = False
            user.is_core_member = True
        else:
            user.is_admin = False
            user.is_core_member = False
    elif action == "reject":
        user.verification_status = "unverified"
        user.is_identity_verified = False
        user.id_card_path = None
    else:
        raise HTTPException(status_code=400, detail="Action must be approve or reject")
        
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/{user_id}/request-admin-action")
async def request_admin_action(
    user_id: uuid.UUID,
    action_type: str = Form(...), # "promote_admin", "promote_core", "delete_user", "edit_user"
    db: AsyncSession = Depends(get_session),
    current_admin: User = Depends(get_current_admin_user)
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=403, detail="Cannot perform this action on yourself.")
    
    otp_code = generate_otp()
    otp = OTP(
        email=current_admin.email,
        otp_code=otp_code,
        action_type=action_type,
        expires_at=datetime.utcnow() + timedelta(minutes=5)
    )
    db.add(otp)
    await db.commit()
    
    await send_otp_email(current_admin.email, otp_code, purpose=f"admin_action_{action_type}")
        
    return {"message": f"OTP sent to admin email for {action_type}"}

@router.post("/{user_id}/confirm-admin-action")
async def confirm_admin_action(
    user_id: uuid.UUID,
    action_type: str = Form(...),
    otp_code: str = Form(...),
    db: AsyncSession = Depends(get_session),
    current_admin: User = Depends(get_current_admin_user)
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=403, detail="Cannot perform this action on yourself.")
        
    # Verify OTP
    result = await db.execute(
        select(OTP)
        .where(OTP.email == current_admin.email, OTP.action_type == action_type, OTP.is_used == False)
        .order_by(OTP.expires_at.desc())
    )
    otp_record = result.scalars().first()
    if not otp_record or otp_record.otp_code != otp_code or otp_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")
        
    otp_record.is_used = True
    db.add(otp_record)
    
    target_result = await db.execute(select(User).where(User.id == user_id))
    target_user = target_result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
        
    if action_type == "promote_admin":
        target_user.is_admin = True
        target_user.is_core_member = False
        target_user.is_identity_verified = True
        target_user.verification_status = "verified"
    elif action_type in ("promote_core", "demote_core"):
        target_user.is_core_member = True
        target_user.is_admin = False
        target_user.is_identity_verified = True
        target_user.verification_status = "verified"
    elif action_type == "demote_student":
        target_user.is_admin = False
        target_user.is_core_member = False
        target_user.is_identity_verified = True
        target_user.verification_status = "verified"
    elif action_type == "delete_user":
        await db.delete(target_user)
        await db.commit()
        return {"message": "User deleted successfully"}
        
    db.add(target_user)
    await db.commit()
    await db.refresh(target_user)
    
    # Send role change notification email
    new_role = "student"
    if target_user.is_admin:
        new_role = "admin"
    elif target_user.is_core_member:
        new_role = "core_member"
        
    await send_role_change_email(
        email_to=target_user.email,
        target_name=target_user.full_name or "Student",
        new_role=new_role,
        admin_name=current_admin.full_name or "Administrator"
    )
    
    return {"message": f"Action {action_type} completed successfully."}
