from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import exc
from typing import List
from datetime import datetime, timedelta
import uuid

from app.database import get_db
from app.models.models import ScheduledPost, ScheduledPostStatus
from app.schemas.schemas import ScheduledPostCreate, ScheduledPostOut, ScheduledPostUpdate
from app.services.youtube_uploader import upload_to_youtube_natively, update_youtube_native_schedule

router = APIRouter(prefix="/api/calendar", tags=["Calendar"])

@router.get("/posts", response_model=List[ScheduledPostOut])
def get_scheduled_posts(
    user_id: str = Query(...),
    db: Session = Depends(get_db)
):
    posts = db.query(ScheduledPost).filter_by(user_id=user_id).order_by(ScheduledPost.scheduled_time.asc()).all()
    return posts

@router.post("/posts", response_model=ScheduledPostOut)
def create_scheduled_post(
    post: ScheduledPostCreate,
    background_tasks: BackgroundTasks,
    user_id: str = Query(...),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()
    post_time = post.scheduled_time.replace(tzinfo=None)
    
    if post_time < now:
        raise HTTPException(status_code=400, detail="Cannot schedule a post in the past. Please choose a future date and time.")

    # Check Subscription Limits
    from app.models.models import User, SubscriptionTier
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    tier = getattr(user.subscription_tier, "value", user.subscription_tier) if user else "free"
    
    if tier != "elite":
        current_month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        posts_this_month = db.query(ScheduledPost).filter(
            ScheduledPost.user_id == user_id,
            ScheduledPost.created_at >= current_month_start
        ).count()
        
        if tier == "free":
            raise HTTPException(status_code=403, detail="Free plan does not include content scheduling. Please upgrade to Pro.")
        elif tier == "pro":
            if posts_this_month >= 30:
                raise HTTPException(status_code=403, detail="Pro plan limit reached (30 scheduled posts/month). Please upgrade to Elite.")

    try:
        new_post = ScheduledPost(
            user_id=user_id,
            target_platforms=post.target_platforms,
            caption=post.caption,
            media_url=post.media_url,
            thumbnail_url=post.thumbnail_url,
            platform_metadata=post.platform_metadata,
            scheduled_time=post.scheduled_time,
            status=ScheduledPostStatus.queued
        )
        db.add(new_post)
        db.commit()
        db.refresh(new_post)
        
        # Only trigger native youtube upload if > 20 mins out.
        # Otherwise, let scheduler.py handle it synchronously when the time comes.
        if "youtube" in new_post.target_platforms and new_post.media_url:
            time_until = (post_time - datetime.utcnow()).total_seconds()
            if time_until > 20 * 60:
                background_tasks.add_task(upload_to_youtube_natively, str(new_post.id))
            
        return new_post
    except exc.SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/posts/{post_id}", response_model=ScheduledPostOut)
def update_scheduled_post(
    post_id: uuid.UUID,
    post_update: ScheduledPostUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    post = db.query(ScheduledPost).filter_by(id=post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Scheduled post not found")
    
    time_changed = False
    new_time = None
    
    if post_update.scheduled_time:
        now = datetime.utcnow()
        new_time = post_update.scheduled_time.replace(tzinfo=None)
        if new_time < now:
            raise HTTPException(status_code=400, detail="Cannot reschedule a post to the past.")
            
        old_time = post.scheduled_time.replace(tzinfo=None) if post.scheduled_time else None
        if new_time != old_time:
            time_changed = True

    update_data = post_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(post, key, value)
    
    try:
        db.commit()
        db.refresh(post)
        
        # If the time was changed and it's a YouTube post, we may need to update YouTube's native scheduler
        if time_changed and new_time and "youtube" in post.target_platforms:
            meta = post.platform_metadata or {}
            # If it was already natively scheduled, we MUST update it
            if meta.get("_youtube_uploaded"):
                background_tasks.add_task(update_youtube_native_schedule, str(post.id), new_time)
            else:
                # If it wasn't uploaded yet, but NOW it's > 20 mins away, we could trigger it
                time_until = (new_time - datetime.utcnow()).total_seconds()
                if time_until > 20 * 60 and post.media_url:
                    background_tasks.add_task(upload_to_youtube_natively, str(post.id))
        
        return post
    except exc.SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/posts/{post_id}")
def delete_scheduled_post(
    post_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    from app.services.supabase_cleaner import delete_media_from_supabase

    post = db.query(ScheduledPost).filter_by(id=post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Scheduled post not found")
    
    # Collect all URLs to delete from Supabase storage
    urls_to_delete = []
    if post.media_url:
        urls_to_delete.extend([u.strip() for u in post.media_url.split(",")])
    if post.thumbnail_url:
        urls_to_delete.append(post.thumbnail_url.strip())
        
    try:
        db.delete(post)
        db.commit()
        
        # Enqueue the storage deletion to happen asynchronously
        if urls_to_delete:
            background_tasks.add_task(delete_media_from_supabase, urls_to_delete)
            
        return {"detail": "Scheduled post deleted"}
    except exc.SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
