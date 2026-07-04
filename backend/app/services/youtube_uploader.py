import os
import tempfile
import httpx
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.models import ConnectedAccount, PlatformEnum, ScheduledPost, ScheduledPostStatus
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from app.services.crypto_service import decrypt_token
import logging

logger = logging.getLogger(__name__)

def upload_to_youtube_natively(post_id: str):
    """
    Synchronous YouTube upload — called via background task OR scheduler.
    """
    db: Session = SessionLocal()
    try:
        post = db.query(ScheduledPost).filter_by(id=post_id).first()
        if not post or not post.media_url or "youtube" not in post.target_platforms:
            return

        # Get connected account
        account = db.query(ConnectedAccount).filter_by(
            user_id=post.user_id,
            platform=PlatformEnum.youtube
        ).first()

        if not account or not account.refresh_token:
            raise Exception(f"No YouTube account/refresh token found for user {post.user_id}")

        # Initialize YouTube Client
        creds = Credentials(
            token=None,
            refresh_token=decrypt_token(account.refresh_token),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.environ.get("GOOGLE_CLIENT_ID"),
            client_secret=os.environ.get("GOOGLE_CLIENT_SECRET")
        )
        youtube = build("youtube", "v3", credentials=creds)

        meta = post.platform_metadata.get("youtube", {}) if post.platform_metadata else {}
        title = meta.get("title", post.caption or "Scheduled Video")
        description = meta.get("description", post.caption or "")
        tags = meta.get("tags", "").split(",")
        tags = [t.strip() for t in tags if t.strip()]
        user_privacy_status = meta.get("privacyStatus", "public")

        # NATIVE SCHEDULING LOGIC
        # YouTube requires publishAt to be >= 15 mins in future, and privacyStatus must be private.
        now = datetime.utcnow()
        post_time = post.scheduled_time.replace(tzinfo=None) if post.scheduled_time else now
        time_until_publish = (post_time - now).total_seconds()
        
        is_native_scheduling = time_until_publish > 20 * 60  # > 20 mins
        
        # Download video to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp_file:
            temp_path = tmp_file.name
            
        first_url = post.media_url.split(",")[0]
            
        with httpx.stream('GET', first_url) as r:
            with open(temp_path, 'wb') as f:
                for chunk in r.iter_bytes():
                    f.write(chunk)

        body = {
            "snippet": {
                "title": title[:100],
                "description": description[:5000],
                "tags": tags,
                "categoryId": "22" # Default to people/blogs
            },
            "status": {
                "selfDeclaredMadeForKids": meta.get("madeForKids", False),
            }
        }
        
        if is_native_scheduling:
            # Force private for native scheduling
            body["status"]["privacyStatus"] = "private"
            body["status"]["publishAt"] = post_time.isoformat() + "Z"
        else:
            # Uploading at the time of release (or very close)
            body["status"]["privacyStatus"] = user_privacy_status
            
        media = MediaFileUpload(temp_path, resumable=True)
        request = youtube.videos().insert(
            part="snippet,status",
            body=body,
            media_body=media
        )
        
        response = request.execute()
        youtube_video_id = response.get('id')
        logger.info(f"Successfully uploaded to YouTube: {youtube_video_id}")
        
        # Mark as uploaded so the scheduler doesn't re-upload
        full_meta = dict(post.platform_metadata or {})
        full_meta["_youtube_uploaded"] = True
        full_meta["_youtube_video_id"] = youtube_video_id
        
        # If it was NOT native scheduling, we can mark it published immediately
        if not is_native_scheduling:
            full_meta["_youtube_live"] = True
            
        post.platform_metadata = full_meta
        db.commit()

        # Clean up temp file
        try:
            os.remove(temp_path)
        except Exception:
            pass
    except Exception as e:
        logger.error(f"YouTube upload failed for post {post_id}: {e}")
        # Re-raise so the scheduler can handle retries and status updates
        raise
    finally:
        db.close()


def update_youtube_native_schedule(post_id: str, new_time: datetime):
    """
    Updates the publishAt time for an already-uploaded YouTube video.
    """
    db: Session = SessionLocal()
    try:
        post = db.query(ScheduledPost).filter_by(id=post_id).first()
        if not post: return

        meta = post.platform_metadata or {}
        youtube_video_id = meta.get("_youtube_video_id")
        
        if not meta.get("_youtube_uploaded") or not youtube_video_id:
            return # Hasn't been uploaded natively yet
            
        account = db.query(ConnectedAccount).filter_by(
            user_id=post.user_id,
            platform=PlatformEnum.youtube
        ).first()

        if not account or not account.refresh_token: return

        creds = Credentials(
            token=None,
            refresh_token=decrypt_token(account.refresh_token),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.environ.get("GOOGLE_CLIENT_ID"),
            client_secret=os.environ.get("GOOGLE_CLIENT_SECRET")
        )
        youtube = build("youtube", "v3", credentials=creds)

        # Check if the new time is > 20 mins away
        now = datetime.utcnow()
        new_time_naive = new_time.replace(tzinfo=None)
        time_until_publish = (new_time_naive - now).total_seconds()
        
        # We need the existing snippet/status to update it
        video_response = youtube.videos().list(
            part="snippet,status",
            id=youtube_video_id
        ).execute()
        
        if not video_response.get("items"):
            logger.warning(f"YouTube video {youtube_video_id} not found to reschedule")
            return
            
        video = video_response["items"][0]
        
        if time_until_publish > 15 * 60:
            # We can still use native scheduling
            video["status"]["privacyStatus"] = "private"
            video["status"]["publishAt"] = new_time_naive.isoformat() + "Z"
        else:
            # It's too close to now. Remove publishAt and make it public (or whatever the original intent was)
            youtube_meta = meta.get("youtube", {})
            user_privacy = youtube_meta.get("privacyStatus", "public")
            video["status"]["privacyStatus"] = user_privacy
            if "publishAt" in video["status"]:
                del video["status"]["publishAt"]

        request = youtube.videos().update(
            part="snippet,status",
            body=video
        )
        request.execute()
        logger.info(f"Successfully rescheduled YouTube video: {youtube_video_id}")
        
    except Exception as e:
        logger.error(f"YouTube reschedule failed for post {post_id}: {e}")
    finally:
        db.close()
