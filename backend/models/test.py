from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship, JSON, Column
from datetime import datetime
import uuid

class TestBase(SQLModel):
    title: str
    description: Optional[str] = None
    event_id: Optional[uuid.UUID] = Field(default=None, foreign_key="event.id")
    is_active: bool = True
    max_score: int = 100
    duration_minutes: int = 60

class Test(TestBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # relationships can be added here
    # submissions: List["Submission"] = Relationship(back_populates="test")

class SubmissionBase(SQLModel):
    test_id: uuid.UUID = Field(foreign_key="test.id")
    user_id: uuid.UUID = Field(foreign_key="user.id")
    score: Optional[int] = None
    is_auto_submitted: bool = False
    violations_count: int = 0
    # Store app-switching events/logs as JSON
    violation_logs: List[dict] = Field(default=[], sa_column=Column(JSON))

class Submission(SubmissionBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    submitted_at: Optional[datetime] = None
