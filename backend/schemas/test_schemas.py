from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

class ViolationEvent(BaseModel):
    timestamp: datetime
    event_type: str # 'app_switch', 'tab_switch', 'minimize'
    description: Optional[str] = None

class LogViolationRequest(BaseModel):
    submission_id: uuid.UUID
    event: ViolationEvent

class ViolationResponse(BaseModel):
    violations_count: int
    is_auto_submitted: bool
    message: str
