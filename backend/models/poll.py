from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
import uuid

class PollOptionBase(SQLModel):
    text: str
    poll_id: uuid.UUID = Field(foreign_key="poll.id", index=True)

class PollOption(PollOptionBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    poll: Optional["Poll"] = Relationship(back_populates="options")

class PollBase(SQLModel):
    question: str
    is_active: bool = True
    is_published: bool = Field(default=False, index=True)
    creator_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id", index=True)

class Poll(PollBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    options: List[PollOption] = Relationship(back_populates="poll", cascade_delete=True)

class PollOptionRead(PollOptionBase):
    id: uuid.UUID

class PollRead(PollBase):
    id: uuid.UUID
    created_at: datetime
    creator_id: Optional[uuid.UUID]
    options: List[PollOptionRead] = []
