"""
Dashboard router — aggregates stats across all connected platforms.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import ConnectedAccount, DailySnapshot, Post, PlatformEnum, ScheduledPost
from app.schemas.schemas import DashboardStats, PlatformStats, GrowthChartData, SnapshotPoint
from app.services.youtube_service import MOCK_CHANNEL, MOCK_SNAPSHOTS_30D

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    user_id: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Return aggregated stats across all connected platforms for the given user.
    Falls back to mock data when no accounts are connected.
    """
    accounts = db.query(ConnectedAccount).filter_by(user_id=user_id).all()

    if not accounts:
        return DashboardStats(
            total_followers=0,
            total_views=0,
            engagement_rate=0.0,
            platforms=[],
        )

    platform_stats = []
    total_followers = 0
    total_views = 0
    total_eng_num = 0.0
    total_eng_den = 0

    for account in accounts:
        latest = (
            db.query(DailySnapshot)
            .filter_by(connected_account_id=account.id)
            .order_by(DailySnapshot.date.desc())
            .first()
        )
        subs = latest.followers if latest else 0
        views = latest.views if latest else 0

        # Engagement rate = (likes + comments) / views * 100 across last 20 posts
        posts = (
            db.query(Post)
            .filter_by(connected_account_id=account.id)
            .order_by(Post.published_at.desc())
            .limit(20)
            .all()
        )
        total_post_views = sum(p.views for p in posts) or 1
        total_likes_comments = sum(p.likes + p.comments for p in posts)
        eng_rate = round((total_likes_comments / total_post_views) * 100, 2)

        platform_stats.append(
            PlatformStats(
                platform=account.platform.value,
                account_name=account.platform_account_name or "",
                account_avatar=account.platform_account_avatar,
                subscribers=subs,
                total_views=views,
                engagement_rate=eng_rate,
                connected_account_id=str(account.id),
            )
        )
        total_followers += subs
        total_views += views
        total_eng_num += eng_rate
        total_eng_den += 1

    avg_eng = round(total_eng_num / total_eng_den, 2) if total_eng_den else 0.0
    return DashboardStats(
        total_followers=total_followers,
        total_views=total_views,
        engagement_rate=avg_eng,
        platforms=platform_stats,
    )


@router.get("/growth", response_model=list[GrowthChartData])
def get_growth_chart(
    user_id: str = Query(...),
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
):
    """
    Return growth snapshot points for the last N days.
    Falls back to 30-day mock data when no accounts are connected.
    """
    accounts = db.query(ConnectedAccount).filter_by(user_id=user_id).all()
    
    from app.models.models import User, SubscriptionTier
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        if user.subscription_tier == SubscriptionTier.free and days > 30:
            days = 30
        elif user.subscription_tier == SubscriptionTier.pro and days > 180:
            days = 180
            
    since = datetime.utcnow() - timedelta(days=days)

    if not accounts:
        return []

    result = []
    for account in accounts:
        snapshots = (
            db.query(DailySnapshot)
            .filter(
                DailySnapshot.connected_account_id == account.id,
                DailySnapshot.date >= since,
            )
            .order_by(DailySnapshot.date.asc())
            .all()
        )
        result.append(
            GrowthChartData(
                platform=account.platform.value,
                account_name=account.platform_account_name or "",
                snapshots=[
                    SnapshotPoint(
                        date=s.date.strftime("%Y-%m-%d"),
                        followers=s.followers,
                        views=s.views,
                    )
                    for s in snapshots
                ],
            )
        )
    return result

@router.get("/videos")
def get_dashboard_videos(
    user_id: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Return recent videos/posts across all connected platforms.
    """
    from app.models.models import User, SubscriptionTier
    
    user = db.query(User).filter(User.id == user_id).first()
    tier = getattr(user.subscription_tier, "value", user.subscription_tier) if user else "free"
    
    accounts = db.query(ConnectedAccount).filter_by(user_id=user_id).all()
    
    if tier == "free":
        accounts = accounts[:1]
    elif tier == "pro":
        accounts = accounts[:3]
        
    if not accounts:
        return []

    acc_ids = [a.id for a in accounts]
    account_map = {str(a.id): a.platform.value for a in accounts}
    
    # Fetch published posts from external platforms (which are now actively synced)
    posts = (
        db.query(Post)
        .filter(Post.connected_account_id.in_(acc_ids))
        .order_by(Post.published_at.desc())
        .limit(50)
        .all()
    )

    # Fetch ONLY upcoming queued scheduled posts
    from app.models.models import ScheduledPost, ScheduledPostStatus
    scheduled = (
        db.query(ScheduledPost)
        .filter_by(user_id=user_id, status=ScheduledPostStatus.queued)
        .order_by(ScheduledPost.scheduled_time.desc())
        .limit(50)
        .all()
    )

    result = []
    
    # Process regular posts
    for p in posts:
        # Default to youtube if missing, though it shouldn't be missing.
        platform_val = account_map.get(str(p.connected_account_id), "youtube")
        
        result.append({
            "id": p.platform_post_id,
            "title": p.title,
            "published_at": p.published_at.isoformat() if p.published_at else datetime.utcnow().isoformat(),
            "views": p.views,
            "likes": p.likes,
            "comments": p.comments,
            "thumbnail_url": p.thumbnail_url,
            "platform": platform_val,
            "status": "published"
        })

    # Process scheduled posts
    for sp in scheduled:
        for plat in sp.target_platforms:
            result.append({
                "id": str(sp.id),
                "title": sp.caption or "Scheduled Post",
                "published_at": sp.scheduled_time.isoformat(),
                "views": 0,
                "likes": 0,
                "comments": 0,
                "thumbnail_url": sp.thumbnail_url,
                "platform": plat,
                "status": "scheduled"
            })

    # Sort the combined list by date descending and limit to 50
    result.sort(key=lambda x: x["published_at"], reverse=True)
    return result[:50]

@router.delete("/disconnect")
def disconnect_platform(
    platform: str,
    user_id: str = Query(...),
    db: Session = Depends(get_db)
):
    try:
        import uuid
        try:
            uid = uuid.UUID(user_id)
        except ValueError:
            return {"success": False, "message": "Invalid user_id format"}
            
        account = db.query(ConnectedAccount).filter_by(user_id=uid, platform=platform).first()
        if account:
            db.delete(account)
            db.commit()
            return {"success": True}
        return {"success": False, "message": "Account not found"}
    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}
