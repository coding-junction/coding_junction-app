from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import List
import uuid

from api.dependencies import get_current_admin_user, get_current_active_user, get_current_core_or_admin
from db.session import get_session
from models.quiz import Quiz, Question, Option, QuizRead
from models.response import QuizResponse
from models.user import User
from services.notification_service import broadcast_notification
from core.websocket import manager

router = APIRouter()

@router.get("/", response_model=List[QuizRead])
async def list_quizzes(
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    from sqlalchemy.orm import selectinload
    load_opts = selectinload(Quiz.questions).selectinload(Question.options)
    if current_user.is_admin:
        query = select(Quiz).options(load_opts)
    elif current_user.is_core_member:
        query = select(Quiz).where((Quiz.is_published == True) | (Quiz.creator_id == current_user.id)).options(load_opts)
    else:
        query = select(Quiz).where(Quiz.is_published == True).options(load_opts)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/")
async def create_quiz(
    quiz_in: dict,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_core_or_admin)
):
    quiz = Quiz(
        title=quiz_in['title'],
        description=quiz_in.get('description'),
        daily_limit=quiz_in.get('daily_limit', 1),
        is_published=quiz_in.get('is_published', False),
        creator_id=current_user.id
    )
    db.add(quiz)
    await db.flush()
    
    for q_data in quiz_in.get('questions', []):
        question = Question(
            text=q_data['text'],
            explanation=q_data.get('explanation'),
            quiz_id=quiz.id
        )
        db.add(question)
        await db.flush()
        for o_data in q_data.get('options', []):
            option = Option(text=o_data['text'], is_correct=o_data['is_correct'], question_id=question.id)
            db.add(option)
            
    await db.commit()
    await db.refresh(quiz)
    
    if quiz.is_published:
        result = await db.execute(select(User.fcm_token).where(User.fcm_token != None))
        tokens = result.scalars().all()
        creator_tag = "Admin" if current_user.is_admin else "Core Member"
        title = f"New Quiz by {current_user.full_name} ({creator_tag})"
        creator_token = current_user.fcm_token
        send_tokens = [t for t in tokens if t != creator_token]
        await broadcast_notification(send_tokens, title, quiz.title)
        
    await manager.broadcast({"type": "REFRESH_QUIZZES"})
    return quiz

@router.patch("/{quiz_id}")
async def update_quiz(
    quiz_id: uuid.UUID,
    quiz_in: dict,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_core_or_admin)
):
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    if not current_user.is_admin and quiz.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own quizzes.")
        
    was_published = quiz.is_published
    
    # Update basic fields
    if 'title' in quiz_in:
        quiz.title = quiz_in['title']
    if 'description' in quiz_in:
        quiz.description = quiz_in['description']
    if 'is_published' in quiz_in:
        quiz.is_published = quiz_in['is_published']
    if 'daily_limit' in quiz_in:
        quiz.daily_limit = quiz_in['daily_limit']
        
    db.add(quiz)
    
    # Update questions if provided in request
    if 'questions' in quiz_in:
        from sqlmodel import delete
        # 1. Fetch existing question IDs
        q_result = await db.execute(select(Question.id).where(Question.quiz_id == quiz.id))
        q_ids = q_result.scalars().all()
        
        # 2. Delete options first to avoid foreign key violations, then questions
        if q_ids:
            await db.execute(delete(Option).where(Option.question_id.in_(q_ids)))
            await db.execute(delete(Question).where(Question.quiz_id == quiz.id))
            
        # 3. Add new questions and options
        for q_data in quiz_in['questions']:
            question = Question(
                text=q_data['text'],
                explanation=q_data.get('explanation'), # Supports explanation field
                quiz_id=quiz.id
            )
            db.add(question)
            await db.flush()
            for o_data in q_data.get('options', []):
                option = Option(
                    text=o_data['text'],
                    is_correct=o_data['is_correct'],
                    question_id=question.id
                )
                db.add(option)
                
    await db.commit()
    await db.refresh(quiz)
    
    if not was_published and quiz.is_published:
        result = await db.execute(select(User.fcm_token).where(User.fcm_token != None))
        tokens = result.scalars().all()
        creator_tag = "Admin" if current_user.is_admin else "Core Member"
        title = f"New Quiz by {current_user.full_name} ({creator_tag})"
        creator_token = current_user.fcm_token
        send_tokens = [t for t in tokens if t != creator_token]
        await broadcast_notification(send_tokens, title, quiz.title)
        
    await manager.broadcast({"type": "REFRESH_QUIZZES"})
    return quiz

@router.get("/{quiz_id}", response_model=QuizRead)
async def get_quiz(
    quiz_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Get a single quiz with its questions and options."""
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Quiz).where(Quiz.id == quiz_id)
        .options(selectinload(Quiz.questions).selectinload(Question.options))
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if not current_user.is_admin and not quiz.is_published:
        raise HTTPException(status_code=403, detail="This quiz is not published")
    return quiz

@router.delete("/{quiz_id}")
async def delete_quiz(
    quiz_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_core_or_admin)
):
    """Admin or creator deletes a quiz."""
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    if not current_user.is_admin and quiz.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own quizzes.")
    
    await db.delete(quiz)
    await db.commit()
    await manager.broadcast({"type": "REFRESH_QUIZZES"})
    return {"message": "Quiz deleted"}

@router.get("/{quiz_id}/my-response")
async def get_my_quiz_response(
    quiz_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Get the current user's own responses for a quiz (for review screen)."""
    result = await db.execute(
        select(QuizResponse)
        .where(QuizResponse.quiz_id == quiz_id, QuizResponse.user_id == current_user.id)
    )
    responses = result.scalars().all()
    if not responses:
        raise HTTPException(status_code=404, detail="No response found for this quiz.")
    return responses

@router.get("/{quiz_id}/responses")
async def get_quiz_responses(
    quiz_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_core_or_admin)
):
    """View all responses for a quiz."""
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    if not current_user.is_admin and quiz.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view responses for your own quizzes.")

    from models.quiz import Question, Option
    result = await db.execute(
        select(QuizResponse, User, Question, Option)
        .join(User, QuizResponse.user_id == User.id)
        .join(Question, QuizResponse.question_id == Question.id)
        .join(Option, QuizResponse.option_id == Option.id)
        .where(QuizResponse.quiz_id == quiz_id)
    )
    responses = result.all()
    
    output = []
    for qr, u, q, o in responses:
        if u.is_admin:
            tag = "Admin"
        elif u.is_core_member:
            tag = "Core Member"
        elif u.verification_status == "verified":
            tag = "Verified Student"
        else:
            tag = "Student (Unverified)"
            
        output.append({
            "id": qr.id,
            "user_id": qr.user_id,
            "user": {
                "full_name": u.full_name,
                "role_tag": tag
            },
            "question": {
                "id": q.id,
                "text": q.text
            },
            "option": {
                "id": o.id,
                "text": o.text,
                "is_correct": o.is_correct
            },
            "submitted_at": qr.submitted_at
        })
    return output

@router.post("/{quiz_id}/submit")
async def submit_quiz(
    quiz_id: uuid.UUID,
    responses: List[dict],
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    quiz_result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = quiz_result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    if quiz.creator_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot participate in your own quiz.")

    result = await db.execute(select(QuizResponse).where(QuizResponse.quiz_id == quiz_id, QuizResponse.user_id == current_user.id))
    if result.first():
        raise HTTPException(status_code=400, detail="You have already submitted this quiz.")
        
    for resp in responses:
        qr = QuizResponse(
            user_id=current_user.id,
            quiz_id=quiz_id,
            question_id=resp['question_id'],
            option_id=resp['option_id']
        )
        db.add(qr)
    
    await db.commit()
    await manager.broadcast({"type": "REFRESH_QUIZZES"})
    await manager.broadcast({"type": "REFRESH_QUIZ_RESPONSES", "quiz_id": str(quiz_id)})
    return {"message": "Submitted successfully"}
