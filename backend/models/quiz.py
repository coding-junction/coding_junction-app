from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
import uuid

class QuizBase(SQLModel):
    title: str
    description: Optional[str] = None
    daily_limit: int = 1
    is_active: bool = True
    is_published: bool = Field(default=False, index=True)
    creator_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id", index=True)

class Quiz(QuizBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    questions: List["Question"] = Relationship(back_populates="quiz")

class QuestionBase(SQLModel):
    text: str
    explanation: Optional[str] = None  # Optional explanation shown after answering
    quiz_id: uuid.UUID = Field(foreign_key="quiz.id", index=True)

class Question(QuestionBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    quiz: Quiz = Relationship(back_populates="questions")
    options: List["Option"] = Relationship(back_populates="question")

class OptionBase(SQLModel):
    text: str
    is_correct: bool = False
    question_id: uuid.UUID = Field(foreign_key="question.id", index=True)

class Option(OptionBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    question: Question = Relationship(back_populates="options")


class OptionRead(OptionBase):
    id: uuid.UUID

class QuestionRead(QuestionBase):
    id: uuid.UUID
    explanation: Optional[str] = None
    options: List[OptionRead] = []

class QuizRead(QuizBase):
    id: uuid.UUID
    created_at: datetime
    creator_id: Optional[uuid.UUID]
    # If you want the route to return the nested questions automatically, include this:
    questions: List[QuestionRead] = []