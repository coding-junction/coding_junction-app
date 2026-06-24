from fastapi import APIRouter, Depends
from pydantic import BaseModel
from api.dependencies import get_current_active_user
from models.user import User
from services.ai_service import generate_response

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

@router.post("/chat", response_model=ChatResponse)
async def ai_chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_active_user)
):
    reply = await generate_response(payload.message)
    return ChatResponse(reply=reply)
