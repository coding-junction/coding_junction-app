from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from models.test import Submission
from schemas.test_schemas import ViolationEvent
from datetime import datetime
import uuid

MAX_VIOLATIONS_ALLOWED = 3
MAX_LATENCY_SECONDS = 60 # Prevent old timestamps from being abused

async def log_violation(db: AsyncSession, submission_id: uuid.UUID, event: ViolationEvent) -> tuple[int, bool]:
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    
    if not submission:
        raise ValueError("Submission not found")
        
    if submission.is_auto_submitted or submission.submitted_at:
        return submission.violations_count, submission.is_auto_submitted

    # Validate timestamp to prevent client-side manipulation (e.g. sending ancient timestamps)
    time_diff = (datetime.utcnow() - event.timestamp.replace(tzinfo=None)).total_seconds()
    if time_diff < -5 or time_diff > MAX_LATENCY_SECONDS:
        # Invalid timestamp (in the future or too far in the past), but we still count it as a violation
        event.description = f"Invalid timestamp detected. Delta: {time_diff}s"
    
    submission.violations_count += 1
    
    # ensure list exists before appending
    logs = submission.violation_logs if submission.violation_logs is not None else []
    # Can't mutate JSON directly and have sqlalchemy pick it up, we have to replace the list
    logs_copy = list(logs)
    logs_copy.append({
        "timestamp": event.timestamp.isoformat(),
        "type": event.event_type,
        "desc": event.description
    })
    submission.violation_logs = logs_copy
    
    if submission.violations_count >= MAX_VIOLATIONS_ALLOWED:
        submission.is_auto_submitted = True
        submission.submitted_at = datetime.utcnow()
        
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    
    return submission.violations_count, submission.is_auto_submitted
