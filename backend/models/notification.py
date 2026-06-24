from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime
import uuid

class NotificationBase(SQLModel):
    title: str
    message: str
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")
    channel: str = Field(default="PUSH") # EMAIL, PUSH
    status: str = Field(default="PENDING") # PENDING, SENT, FAILED

class Notification(NotificationBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    sent_at: Optional[datetime] = None
