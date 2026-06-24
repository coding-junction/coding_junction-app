from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
import uuid
from typing import List

from api.dependencies import get_current_admin_user, get_current_active_user
from db.session import get_session
from models.user import User
from models.test import Submission, SubmissionBase

router = APIRouter()

@router.post("/", response_model=Submission)
async def start_submission(
    submission_in: SubmissionBase,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    # Ensure a user is starting their own submission
    if submission_in.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    submission = Submission(**submission_in.model_dump())
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    return submission

@router.get("/{submission_id}", response_model=Submission)
async def get_submission(
    submission_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    if submission.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to view this submission")
        
    return submission
