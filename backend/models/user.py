from typing import Optional
from sqlmodel import SQLModel, Field, String
from pydantic import computed_field
from datetime import datetime
import uuid

class UserBase(SQLModel):
    email: str = Field(unique=True, index=True)
    full_name: Optional[str] = None
    is_active: bool = Field(default=True)
    is_admin: bool = Field(default=False)
    is_core_member: bool = Field(default=False)
    is_verified: bool = Field(default=False)
    college_name: Optional[str] = None
    department: Optional[str] = None
    year: Optional[int] = None
    semester: Optional[int] = None
    favorite_subjects: Optional[str] = None
    cgpa: Optional[float] = None
    roll_no: Optional[str] = None
    batch: Optional[str] = None
    is_identity_verified: bool = Field(default=False)
    verification_status: str = Field(default="unverified") # unverified, pending, verified, rejected
    verification_document_type: Optional[str] = None # id_card, fee_receipt
    id_card_path: Optional[str] = None
    profile_image_path: Optional[str] = None
    fcm_token: Optional[str] = None
    welcome_shown: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str

class UserRead(UserBase):
    id: uuid.UUID

    @computed_field
    @property
    def role(self) -> str:
        if self.is_admin:
            return "admin"
        if self.is_core_member:
            return "core_member"
        if self.verification_status == "verified":
            return "student_verified"
        return "student_unverified"

class UserCreate(UserBase):
    password: str

class UserUpdate(SQLModel):
    full_name: Optional[str] = None
    college_name: Optional[str] = None
    department: Optional[str] = None
    year: Optional[int] = None
    semester: Optional[int] = None
    favorite_subjects: Optional[str] = None
    cgpa: Optional[float] = None
    roll_no: Optional[str] = None
    batch: Optional[str] = None
    welcome_shown: Optional[bool] = None
