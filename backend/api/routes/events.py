from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import List
import uuid
from datetime import datetime

from api.dependencies import get_current_admin_user, get_current_active_user, get_current_core_or_admin
from db.session import get_session
from models.event import Event, EventBase
from models.user import User

from services.notification_service import broadcast_notification
from services.email_service import broadcast_event_email
from core.websocket import manager

router = APIRouter()

@router.get("/", response_model=List[Event])
async def list_events(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.is_admin:
        query = select(Event).offset(skip).limit(limit)
    elif current_user.is_core_member:
        query = select(Event).where((Event.is_published == True) | (Event.creator_id == current_user.id)).offset(skip).limit(limit)
    else:
        query = select(Event).where(Event.is_published == True).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=Event)
async def create_event(
    event_in: EventBase,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_core_or_admin)
):
    event_data = event_in.model_dump()
    event_data['creator_id'] = current_user.id
    if event_data['start_date'].tzinfo:
        event_data['start_date'] = event_data['start_date'].replace(tzinfo=None)
    if event_data['end_date'].tzinfo:
        event_data['end_date'] = event_data['end_date'].replace(tzinfo=None)
        
    event = Event(**event_data)
    db.add(event)
    await db.commit()
    await db.refresh(event)
    
    if event.is_published:
        # Push notification
        result = await db.execute(select(User.fcm_token).where(User.fcm_token != None))
        tokens = result.scalars().all()
        creator_tag = "Admin" if current_user.is_admin else "Core Member"
        title = f"New Event by {current_user.full_name} ({creator_tag})"
        creator_token = current_user.fcm_token
        send_tokens = [t for t in tokens if t != creator_token]
        await broadcast_notification(send_tokens, title, event.name)
        
        # Email Broadcast
        email_result = await db.execute(select(User.email).where(User.is_active == True))
        emails = email_result.scalars().all()
        start_date_str = event.start_date.strftime("%Y-%m-%d %H:%M") if event.start_date else "TBA"
        import asyncio
        asyncio.create_task(broadcast_event_email(emails, event.name, event.description, start_date_str, current_user.email))
        
    await manager.broadcast({"type": "REFRESH_EVENTS"})
    return event

@router.patch("/{event_id}", response_model=Event)
async def update_event(
    event_id: uuid.UUID,
    event_in: dict,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_core_or_admin)
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if not current_user.is_admin and event.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own events.")
    
    was_published = event.is_published
    
    for field, value in event_in.items():
        if field in ['start_date', 'end_date'] and value:
             if isinstance(value, str):
                dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                setattr(event, field, dt.replace(tzinfo=None))
             else:
                setattr(event, field, value.replace(tzinfo=None))
        else:
             setattr(event, field, value)
    
    db.add(event)
    await db.commit()
    await db.refresh(event)
    
    if not was_published and event.is_published:
        # Push notification
        result = await db.execute(select(User.fcm_token).where(User.fcm_token != None))
        tokens = result.scalars().all()
        creator_tag = "Admin" if current_user.is_admin else "Core Member"
        title = f"New Event by {current_user.full_name} ({creator_tag})"
        creator_token = current_user.fcm_token
        send_tokens = [t for t in tokens if t != creator_token]
        await broadcast_notification(send_tokens, title, event.name)
        
        # Email Broadcast
        email_result = await db.execute(select(User.email).where(User.is_active == True))
        emails = email_result.scalars().all()
        start_date_str = event.start_date.strftime("%Y-%m-%d %H:%M") if event.start_date else "TBA"
        import asyncio
        asyncio.create_task(broadcast_event_email(emails, event.name, event.description, start_date_str, current_user.email))
        
    await manager.broadcast({"type": "REFRESH_EVENTS"})
    return event

@router.delete("/{event_id}")
async def delete_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_core_or_admin)
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if not current_user.is_admin and event.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own events.")
        
    await db.delete(event)
    await db.commit()
    await manager.broadcast({"type": "REFRESH_EVENTS"})
    return {"message": "Event deleted successfully"}
