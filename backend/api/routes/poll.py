from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import List
import uuid

from api.dependencies import get_current_admin_user, get_current_active_user, get_current_core_or_admin
from db.session import get_session
from models.poll import Poll, PollOption, PollRead
from models.response import PollResponse
from models.user import User
from services.notification_service import broadcast_notification
from core.websocket import manager

router = APIRouter()

@router.get("/", response_model=List[PollRead])
async def list_polls(
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    from sqlalchemy.orm import selectinload
    if current_user.is_admin:
        query = select(Poll).options(selectinload(Poll.options))
    elif current_user.is_core_member:
        query = select(Poll).where((Poll.is_published == True) | (Poll.creator_id == current_user.id)).options(selectinload(Poll.options))
    else:
        query = select(Poll).where(Poll.is_published == True).options(selectinload(Poll.options))
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/")
async def create_poll(
    poll_in: dict,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_core_or_admin)
):
    poll = Poll(
        question=poll_in['question'],
        is_published=poll_in.get('is_published', False),
        creator_id=current_user.id
    )
    db.add(poll)
    await db.flush()
    
    for o_text in poll_in.get('options', []):
        option = PollOption(text=o_text, poll_id=poll.id)
        db.add(option)
        
    await db.commit()
    await db.refresh(poll)
    
    if poll.is_published:
        result = await db.execute(select(User.fcm_token).where(User.fcm_token != None))
        tokens = result.scalars().all()
        creator_tag = "Admin" if current_user.is_admin else "Core Member"
        title = f"New Poll by {current_user.full_name} ({creator_tag})"
        creator_token = current_user.fcm_token
        send_tokens = [t for t in tokens if t != creator_token]
        await broadcast_notification(send_tokens, title, poll.question)
        
    await manager.broadcast({"type": "REFRESH_POLLS"})
    return poll

@router.patch("/{poll_id}")
async def update_poll(
    poll_id: uuid.UUID,
    poll_in: dict,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_core_or_admin)
):
    result = await db.execute(select(Poll).where(Poll.id == poll_id))
    poll = result.scalar_one_or_none()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
        
    if not current_user.is_admin and poll.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own polls.")
        
    was_published = poll.is_published
    if 'question' in poll_in:
        poll.question = poll_in['question']
    if 'is_published' in poll_in:
        poll.is_published = poll_in['is_published']
            
    db.add(poll)
    
    if 'options' in poll_in:
        # Fetch current options to compare and avoid resetting votes if they haven't changed
        current_options_result = await db.execute(select(PollOption).where(PollOption.poll_id == poll.id))
        current_options = current_options_result.scalars().all()
        current_option_texts = [o.text for o in current_options]
        
        new_option_texts = poll_in['options']
        if set(current_option_texts) != set(new_option_texts):
            from sqlmodel import delete
            # Delete old responses first to prevent ForeignKeyViolationError
            await db.execute(delete(PollResponse).where(PollResponse.poll_id == poll.id))
            # Delete old options
            await db.execute(delete(PollOption).where(PollOption.poll_id == poll.id))
            # Insert new options
            for o_text in new_option_texts:
                option = PollOption(text=o_text, poll_id=poll.id)
                db.add(option)
            
    await db.commit()
    await db.refresh(poll)
    
    if not was_published and poll.is_published:
        result = await db.execute(select(User.fcm_token).where(User.fcm_token != None))
        tokens = result.scalars().all()
        creator_tag = "Admin" if current_user.is_admin else "Core Member"
        title = f"New Poll by {current_user.full_name} ({creator_tag})"
        creator_token = current_user.fcm_token
        send_tokens = [t for t in tokens if t != creator_token]
        await broadcast_notification(send_tokens, title, poll.question)
        
    await manager.broadcast({"type": "REFRESH_POLLS"})
    return poll

@router.get("/{poll_id}", response_model=PollRead)
async def get_poll(
    poll_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Get a single poll with its options."""
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Poll).where(Poll.id == poll_id).options(selectinload(Poll.options))
    )
    poll = result.scalar_one_or_none()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    if not current_user.is_admin and not poll.is_published:
        raise HTTPException(status_code=403, detail="This poll is not published")
    return poll

@router.get("/{poll_id}/responses")
async def get_poll_responses(
    poll_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """View responses for a poll."""
    result = await db.execute(select(Poll).where(Poll.id == poll_id))
    poll = result.scalar_one_or_none()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
        
    # Anyone can view responses IF they have voted or if they are admin/creator
    has_voted_result = await db.execute(select(PollResponse).where(PollResponse.poll_id == poll_id, PollResponse.user_id == current_user.id))
    has_voted = has_voted_result.first() is not None
    
    can_view = has_voted or current_user.is_admin or poll.creator_id == current_user.id
    if not can_view:
        raise HTTPException(status_code=403, detail="You must vote before viewing responses.")

    # Fetch responses joined with User details
    result = await db.execute(
        select(PollResponse, User)
        .join(User, PollResponse.user_id == User.id)
        .where(PollResponse.poll_id == poll_id)
    )
    responses = result.all()
    
    output = []
    for r, u in responses:
        if u.is_admin:
            tag = "Admin"
        elif u.is_core_member:
            tag = "Core Member"
        elif u.verification_status == "verified":
            tag = "Verified Student"
        else:
            tag = "Student (Unverified)"
            
        output.append({
            "id": r.id,
            "user_id": r.user_id,
            "poll_id": r.poll_id,
            "option_id": r.option_id,
            "submitted_at": r.submitted_at,
            "user": {
                "full_name": u.full_name,
                "role_tag": tag
            }
        })
    return output

@router.delete("/{poll_id}")
async def delete_poll(
    poll_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_core_or_admin)
):
    """Admin or creator deletes a poll."""
    result = await db.execute(select(Poll).where(Poll.id == poll_id))
    poll = result.scalar_one_or_none()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
        
    if not current_user.is_admin and poll.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own polls.")
    
    # Delete poll responses first to prevent ForeignKeyViolationError
    from sqlmodel import delete
    await db.execute(delete(PollResponse).where(PollResponse.poll_id == poll_id))
    
    await db.delete(poll)
    await db.commit()
    await manager.broadcast({"type": "REFRESH_POLLS"})
    return {"message": "Poll deleted"}

@router.post("/{poll_id}/vote")
async def vote_poll(
    poll_id: uuid.UUID,
    option_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    poll_result = await db.execute(select(Poll).where(Poll.id == poll_id))
    poll = poll_result.scalar_one_or_none()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
        
    if poll.creator_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot vote in your own poll.")

    result = await db.execute(select(PollResponse).where(PollResponse.poll_id == poll_id, PollResponse.user_id == current_user.id))
    if result.first():
        raise HTTPException(status_code=400, detail="You have already voted in this poll.")
        
    pr = PollResponse(
        user_id=current_user.id,
        poll_id=poll_id,
        option_id=option_id
    )
    db.add(pr)
    await db.commit()
    await manager.broadcast({"type": "REFRESH_POLLS"})
    await manager.broadcast({"type": "REFRESH_POLL_RESPONSES", "poll_id": str(poll_id)})
    return {"message": "Voted successfully"}
