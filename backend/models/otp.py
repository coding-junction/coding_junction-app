from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime, timedelta
import uuid

class OTP(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(index=True)
    otp_code: str
    action_type: str = Field(default="login") # login, promote_user, delete_user, edit_user
    expires_at: datetime
    is_used: bool = Field(default=False)

class OTPVerify(SQLModel):
    email: str
    otp_code: str
    action_type: str = "login"
