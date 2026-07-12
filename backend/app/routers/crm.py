from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
import uuid

from app.database import get_db
from app.models.models import Comment, Post, ConnectedAccount, User
from app.tasks.ai_tasks import sync_and_analyze_comments
from app.services.instagram_service import sync_instagram_account

router = APIRouter(prefix="/api/crm", tags=["Sentiment CRM"])

@router.get("/comments")
async def get_comments(user_id: uuid.UUID, category: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Get all comments for a user, optionally filtered by category.
    """
    query = db.query(Comment).join(Post).join(ConnectedAccount).filter(ConnectedAccount.user_id == user_id)
    
    if category and category != 'all':
        query = query.filter(Comment.category == category)
        
    comments = query.order_by(desc(Comment.created_at)).limit(100).all()
    
    return [
        {
            "id": c.id,
            "post_id": c.post_id,
            "author_name": c.author_name,
            "author_profile_url": c.author_profile_url,
            "text": c.text,
            "sentiment_score": c.sentiment_score,
            "category": c.category,
            "created_at": c.created_at,
            "post_title": c.post.title
        } for c in comments
    ]

@router.get("/superfans")
async def get_superfans(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """
    Returns users who have commented the most across all the creator's posts.
    """
    superfans = (
        db.query(
            Comment.author_name,
            Comment.author_profile_url,
            func.count(Comment.id).label('comment_count')
        )
        .join(Post)
        .join(ConnectedAccount)
        .filter(ConnectedAccount.user_id == user_id)
        .group_by(Comment.author_name, Comment.author_profile_url)
        .order_by(desc('comment_count'))
        .limit(10)
        .all()
    )
    
    return [
        {
            "author_name": s.author_name,
            "author_profile_url": s.author_profile_url,
            "comment_count": s.comment_count
        } for s in superfans
    ]


@router.post("/comments/sync/{account_id}")
async def sync_crm_comments(account_id: str, db: Session = Depends(get_db)):
    """
    Manually trigger sync and analysis for a specific account.
    """
    account = db.query(ConnectedAccount).filter_by(id=account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    try:
        await sync_instagram_account(db, account)
        sync_and_analyze_comments.delay()
        return {"status": "Sync and analysis queued"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-analyze")
async def trigger_ai_analyze():
    """
    Manually trigger the celery task to analyze any pending comments.
    """
    sync_and_analyze_comments.delay()
    return {"status": "Analysis queued"}

