from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime
import uuid

class DocumentVerification(SQLModel, table=True):
    """Track user document submissions and admin verification decisions."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    doc_path: str  # Path to uploaded document
    doc_type: str = "id_card"  # Type: id_card, etc.
    status: str = Field(default="pending")  # pending, approved, rejected
    admin_notes: Optional[str] = None
    assigned_role: Optional[str] = None  # admin, core_member, or None for student
    created_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[uuid.UUID] = Field(foreign_key="user.id", default=None)
