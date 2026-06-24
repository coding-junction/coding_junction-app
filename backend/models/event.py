from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime
import uuid

class EventBase(SQLModel):
    name: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    registration_link: Optional[str] = None
    is_active: bool = True
    is_published: bool = Field(default=False)
    creator_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")

class Event(EventBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
