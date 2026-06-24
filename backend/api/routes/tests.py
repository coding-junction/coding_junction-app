from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from api.dependencies import get_current_active_user
from db.session import get_session
from models.user import User
from schemas.test_schemas import LogViolationRequest, ViolationResponse
from services.test_service import log_violation

router = APIRouter()

@router.post("/violations", response_model=ViolationResponse)
async def report_violation(
    payload: LogViolationRequest,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    try:
        count, auto_submitted = await log_violation(db, payload.submission_id, payload.event)
        msg = "Violation logged."
        if auto_submitted:
            msg = "Test auto-submitted due to maximum violations exceeded."
            
        return ViolationResponse(
            violations_count=count,
            is_auto_submitted=auto_submitted,
            message=msg
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
