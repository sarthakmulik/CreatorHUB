from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import uuid

from app.database import get_db
from app.models.models import User, ConnectedAccount, DailySnapshot

router = APIRouter(prefix="/api/media-kit", tags=["Media Kit"])

@router.get("/{user_id}")
async def get_media_kit(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """
    Public endpoint to fetch a user's Media Kit data.
    Aggregates followers, 30-day views, and calculates Dynamic Sponsorship Value.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    accounts = db.query(ConnectedAccount).filter(ConnectedAccount.user_id == user_id).all()
    
    total_followers = 0
    total_30_day_views = 0
    
    # Simple logic: sum the latest snapshot followers, and sum views from last 30 snapshots
    platforms_data = []
    
    for account in accounts:
        # Get latest snapshot for followers
        latest_snapshot = db.query(DailySnapshot).filter(
            DailySnapshot.connected_account_id == account.id
        ).order_by(DailySnapshot.date.desc()).first()
        
        followers = latest_snapshot.followers if latest_snapshot else 0
        total_followers += followers
        
        # Get sum of views from last 30 snapshots
        thirty_days_views_result = db.query(func.sum(DailySnapshot.views)).filter(
            DailySnapshot.connected_account_id == account.id
        ).order_by(DailySnapshot.date.desc()).limit(30).scalar()
        
        views = thirty_days_views_result or 0
        total_30_day_views += views
        
        platforms_data.append({
            "platform": account.platform,
            "account_name": account.platform_account_name,
            "followers": followers,
            "views_30_days": views
        })

    # Calculate Sponsorship Value based on niche_cpm
    # Formula: (total_30_day_views / 1000) * niche_cpm
    sponsorship_value = (total_30_day_views / 1000) * user.niche_cpm

    return {
        "creator": {
            "name": user.display_name or "Creator",
            "avatar_url": user.avatar_url,
            "niche_cpm": user.niche_cpm
        },
        "stats": {
            "total_followers": total_followers,
            "total_30_day_views": total_30_day_views,
            "sponsorship_value": round(sponsorship_value, 2)
        },
        "platforms": platforms_data
    }
