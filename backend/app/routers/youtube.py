"""
YouTube OAuth router.

Endpoints:
  GET  /api/youtube/auth-url        — returns the Google consent URL
  GET  /api/youtube/callback        — handles OAuth redirect, stores tokens, fetches data
  GET  /api/youtube/connect-mock    — connect with mock data (no real OAuth needed)
  GET  /api/youtube/videos/{id}     — list stored videos for a connected account
  POST /api/youtube/sync/{id}       — trigger fresh data pull
"""
import secrets
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.schemas import (
    YouTubeAuthUrlResponse,
    ConnectedAccountOut,
    PostOut,
)
from app.services.youtube_service import (
    get_authorization_url,
    connect_youtube_account,
    MOCK_VIDEOS,
)
from app.models.models import ConnectedAccount, Post
from app.config import get_settings

router = APIRouter(prefix="/api/youtube", tags=["youtube"])
settings = get_settings()


@router.get("/auth-url", response_model=YouTubeAuthUrlResponse)
def get_auth_url(user_id: str = Query(..., description="The authenticated user's UUID"), frontend_url: str = Query(None)):
    """Return the Google OAuth2 consent URL for YouTube scope."""
    csrf_token = secrets.token_urlsafe(16)
    state = f"{user_id}:{csrf_token}"
    if frontend_url:
        import base64
        encoded_url = base64.urlsafe_b64encode(frontend_url.encode()).decode()
        state = f"{user_id}:{csrf_token}:{encoded_url}"
    url = get_authorization_url(state=state)
    return {"auth_url": url}


@router.get("/callback")
async def youtube_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    db: Session = Depends(get_db),
):
    """
    Google OAuth callback. Exchanges code for tokens, fetches YouTube data,
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
        return RedirectResponse(f"{redirect_base}/settings?error={error}")

    try:
        await connect_youtube_account(db=db, user_id=user_id, code=code)
    except Exception as exc:
        import traceback
        import urllib.parse
        traceback.print_exc()
        error_msg = urllib.parse.quote(str(exc))
        return RedirectResponse(f"{redirect_base}/settings?error={error_msg}")

    return RedirectResponse(f"{redirect_base}/settings?connected=youtube")





@router.get("/videos/{account_id}", response_model=list[PostOut])
def get_videos(account_id: str, db: Session = Depends(get_db)):
    """Return stored video posts for a connected YouTube account."""
    posts = (
        db.query(Post)
        .filter_by(connected_account_id=account_id)
        .order_by(Post.published_at.desc())
        .limit(20)
        .all()
    )
    if not posts:
        # Return mock data if DB has no entries yet
        from datetime import datetime
        mock = []
        for v in MOCK_VIDEOS:
            p = Post(**{
                k: v[k] if k != "video_id" else None
                for k in ["title", "thumbnail_url", "views", "likes", "comments", "shares", "duration_seconds"]
            })
            p.platform_post_id = v["video_id"]
            published = v.get("published_at")
            if published:
                p.published_at = datetime.fromisoformat(published)
            mock.append(p)
        return [PostOut.model_validate(p) for p in mock]
    return [PostOut.model_validate(p) for p in posts]


@router.post("/sync/{account_id}")
async def sync_youtube(account_id: str, db: Session = Depends(get_db)):
    """Trigger a fresh data sync for the given connected account."""
    account = db.query(ConnectedAccount).filter_by(id=account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Connected account not found")

    from app.services.crypto_service import decrypt_token
    from app.services.youtube_service import (
        fetch_channel_stats, fetch_recent_videos, refresh_access_token
    )
    from datetime import datetime, timedelta

    access_token = decrypt_token(account.oauth_token)
    if account.token_expires_at and account.token_expires_at < datetime.utcnow():
        refresh_tok = decrypt_token(account.refresh_token or "")
        if refresh_tok and not refresh_tok.startswith("mock"):
            token_data = await refresh_access_token(refresh_tok)
            access_token = token_data["access_token"]
            account.oauth_token = __import__("app.services.crypto_service", fromlist=["encrypt_token"]).encrypt_token(access_token)
            account.token_expires_at = datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 3600))
            db.commit()

    account.last_synced_at = datetime.utcnow()
    db.commit()
    return {"status": "synced", "synced_at": account.last_synced_at}
