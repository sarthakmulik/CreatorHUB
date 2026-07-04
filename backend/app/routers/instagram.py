import secrets
import urllib.parse
import traceback
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import get_settings
from app.services.instagram_service import get_authorization_url, connect_instagram_account

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
