from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel
import uuid

from app.database import get_db
from app.models.models import RepurposedVideo, RepurposedVideoStatus
from app.tasks.ai_tasks import process_video_repurpose

router = APIRouter(prefix="/api/repurpose", tags=["AI Repurposing"])

class RepurposeRequest(BaseModel):
    user_id: uuid.UUID
    youtube_url: str

@router.post("")
async def start_repurpose(req: RepurposeRequest, db: Session = Depends(get_db)):
    """
    Queue a YouTube video for AI repurposing (transcription, clipping to 9:16).
    """
    # Create database record
    new_video = RepurposedVideo(
        user_id=req.user_id,
        original_video_url=req.youtube_url,
        status=RepurposedVideoStatus.processing
    )
    db.add(new_video)
    db.commit()
    db.refresh(new_video)
    
    # Queue Celery Task
    process_video_repurpose.delay(str(new_video.id), req.youtube_url)
    
    return {"message": "Processing started", "id": str(new_video.id)}

@router.get("/status")
async def get_repurpose_status(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """
    Get all repurposed videos for a user.
    """
    videos = db.query(RepurposedVideo).filter(RepurposedVideo.user_id == user_id).order_by(desc(RepurposedVideo.created_at)).all()
    
    return [
        {
            "id": v.id,
            "original_video_url": v.original_video_url,
            "clipped_video_url": v.clipped_video_url,
            "status": v.status.value,
            "created_at": v.created_at
        } for v in videos
    ]
