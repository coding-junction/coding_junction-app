from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime
import uuid

class QuizResponse(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    quiz_id: uuid.UUID = Field(foreign_key="quiz.id", index=True)
    question_id: uuid.UUID = Field(foreign_key="question.id", index=True)
    option_id: uuid.UUID = Field(foreign_key="option.id", index=True)
    submitted_at: datetime = Field(default_factory=datetime.utcnow)

class PollResponse(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    poll_id: uuid.UUID = Field(foreign_key="poll.id", index=True)
    option_id: uuid.UUID = Field(foreign_key="polloption.id", index=True)
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
