import secrets
import urllib.parse
import traceback
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import get_settings
from app.services.instagram_service import (
    get_authorization_url, connect_instagram_account, sync_instagram_account,
    fetch_audience_demographics,
)
from app.models.models import ConnectedAccount, PlatformEnum, Post, PostInsight, AudienceSnapshot, AudienceOnline

router = APIRouter(prefix="/api/instagram", tags=["instagram"])
settings = get_settings()


@router.get("/auth-url")
def get_auth_url(user_id: str = Query(..., description="The authenticated user's UUID"), frontend_url: str = Query(None)):
    """Return the Facebook OAuth2 consent URL for Instagram scope."""
    csrf_token = secrets.token_urlsafe(16)
    state = f"{user_id}:{csrf_token}"
    if frontend_url:
        import base64
        encoded_url = base64.urlsafe_b64encode(frontend_url.encode()).decode()
        state = f"{user_id}:{csrf_token}:{encoded_url}"
    url = get_authorization_url(state=state)
    return {"auth_url": url}


@router.get("/callback")
async def instagram_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    error_description: str = Query(None),
    db: Session = Depends(get_db),
):
    """
    Facebook/Instagram OAuth callback. Exchanges code for tokens, fetches Instagram data,
    then redirects the user back to the Settings page.
    """
    if not state or ":" not in state:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    parts = state.split(":")
    user_id = parts[0]

    redirect_base = settings.frontend_url
    if len(parts) > 2:
        import base64
        try:
            redirect_base = base64.urlsafe_b64decode(parts[2]).decode()
        except Exception:
            pass

    if error:
        err_msg = urllib.parse.quote(error_description or error)
        return RedirectResponse(f"{redirect_base}/settings?error={err_msg}")

    try:
        await connect_instagram_account(db=db, user_id=user_id, code=code)
    except Exception as exc:
        traceback.print_exc()
        error_msg = urllib.parse.quote(str(exc))
        return RedirectResponse(f"{redirect_base}/settings?error={error_msg}")
    return RedirectResponse(f"{redirect_base}/settings?connected=instagram")


@router.post("/sync/{connected_account_id}")
async def sync_instagram_endpoint(connected_account_id: str, db: Session = Depends(get_db)):
    account = db.query(ConnectedAccount).filter_by(id=connected_account_id, platform=PlatformEnum.instagram).first()
    if not account:
        raise HTTPException(status_code=404, detail="Instagram account not found")

    try:
        await sync_instagram_account(db, account)
        return {"success": True, "message": "Instagram account synced"}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/insights/{post_id}")
def get_post_insights_endpoint(post_id: str, db: Session = Depends(get_db)):
    """
    Return the stored deep-insight metrics for a single post (by CreatorHub Post UUID
    OR by Instagram platform_post_id). Falls back to an empty object if none stored.
    """
    # Try parsing as a CreatorHub UUID first; otherwise treat as platform_post_id.
    post = None
    try:
        post = db.query(Post).filter_by(id=uuid.UUID(post_id)).first()
    except (ValueError, TypeError):
        post = db.query(Post).filter_by(platform_post_id=post_id).first()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    insight = post.insight
    return {
        "post_id": str(post.id),
        "platform_post_id": post.platform_post_id,
        "media_product_type": insight.media_product_type if insight else None,
        "metrics": insight.metrics if insight else {},
    }


@router.get("/audience/{connected_account_id}")
async def get_audience_endpoint(connected_account_id: str, refresh: bool = Query(False), db: Session = Depends(get_db)):
    """
    Return the latest stored audience demographics for a connected Instagram account.
    If `refresh=true`, fetch fresh data from the Graph API before returning.
    """
    account = db.query(ConnectedAccount).filter_by(
        id=connected_account_id, platform=PlatformEnum.instagram
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Instagram account not found")

    if refresh:
        from app.services.crypto_service import decrypt_token
        try:
            token = decrypt_token(account.oauth_token)
            from app.services.instagram_service import _persist_audience_snapshot
            await _persist_audience_snapshot(db, token, account.platform_account_id, account.id)
            db.commit()
        except Exception as exc:
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Failed to refresh audience: {exc}")

    latest = (
        db.query(AudienceSnapshot)
        .filter_by(connected_account_id=account.id)
        .order_by(AudienceSnapshot.date.desc())
        .first()
    )
    if not latest:
        return {"demographics": {"gender_age": [], "cities": [], "countries": []}, "date": None}

    return {"demographics": latest.demographics, "date": latest.date.isoformat()}


@router.get("/best-time/{connected_account_id}")
async def get_best_time_endpoint(connected_account_id: str, db: Session = Depends(get_db)):
    """
    Return the Best Time to Post heatmap data (AudienceOnline).
    Returns 24-point array (IST hours 0-23) + top 3 slots.
    """
    account = db.query(ConnectedAccount).filter_by(
        id=connected_account_id, platform=PlatformEnum.instagram
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Instagram account not found")

    online_data = (
        db.query(AudienceOnline)
        .filter_by(connected_account_id=account.id)
        .order_by(AudienceOnline.date.desc())
        .all()
    )
    
    if not online_data:
        return {"heatmap": [], "top_slots": []}

    # Only take the latest date's data
    latest_date = online_data[0].date
    latest_data = [d for d in online_data if d.date == latest_date]
    
    heatmap = [{"hour_ist": d.hour_ist, "weight": d.weight} for d in latest_data]
    heatmap.sort(key=lambda x: x["hour_ist"])
    
    top_slots = sorted(heatmap, key=lambda x: x["weight"], reverse=True)[:3]

    return {"heatmap": heatmap, "top_slots": top_slots, "date": latest_date.isoformat()}


@router.get("/best-time-by-user/{user_id}")
async def get_best_time_by_user_endpoint(user_id: str, db: Session = Depends(get_db)):
    """
    Return the Best Time to Post for the user's first connected Instagram account.
    """
    account = db.query(ConnectedAccount).filter_by(
        user_id=uuid.UUID(user_id), platform=PlatformEnum.instagram
    ).first()
    if not account:
        return {"top_slots": []}

    online_data = (
        db.query(AudienceOnline)
        .filter_by(connected_account_id=account.id)
        .order_by(AudienceOnline.date.desc())
        .all()
    )
    
    if not online_data:
        return {"top_slots": []}

    latest_date = online_data[0].date
    latest_data = [d for d in online_data if d.date == latest_date]
    
    heatmap = [{"hour_ist": d.hour_ist, "weight": d.weight} for d in latest_data]
    heatmap.sort(key=lambda x: x["hour_ist"])
    
    top_slots = sorted(heatmap, key=lambda x: x["weight"], reverse=True)[:3]
    return {"top_slots": top_slots}
