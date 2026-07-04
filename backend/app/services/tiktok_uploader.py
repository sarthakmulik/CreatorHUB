import logging
import httpx
import json
from app.models.models import ScheduledPost, ConnectedAccount
from app.services.crypto_service import decrypt_token

logger = logging.getLogger(__name__)

async def publish_to_tiktok_api(post: ScheduledPost, account: ConnectedAccount):
    """
    Publish a post to TikTok using the TikTok Content Posting API (Direct Post).
    """
    if not account.oauth_token:
        raise ValueError("No OAuth token found for TikTok account")
        
    access_token = decrypt_token(account.oauth_token)
    
    media_urls = post.media_url.split(",") if post.media_url else []
    if not media_urls:
        raise ValueError("TikTok requires at least one video to publish")
        
    video_url = media_urls[0]
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        # TikTok Content Posting API - Direct Post (Pull from URL)
        # Note: This requires the `video.publish` scope. If the app only has `video.list`,
        # this will fail with a scope error until the app is approved by TikTok.
        init_url = "https://open.tiktokapis.com/v2/post/publish/video/init/"
        
        payload = {
            "post_info": {
                "title": post.caption or "",
                "privacy_level": "PUBLIC_TO_EVERYONE",
                "disable_comment": False,
                "disable_duet": False,
                "disable_stitch": False
            },
            "source_info": {
                "source": "PULL_FROM_URL",
                "video_url": video_url
            }
        }
        
        res = await client.post(
            init_url,
            json=payload,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json; charset=UTF-8"
            }
        )
        
        if res.status_code != 200:
            raise Exception(f"Failed to initialize TikTok upload: {res.text}")
            
        data = res.json()
        if data.get("error", {}).get("code") != "ok":
            raise Exception(f"TikTok API Error: {json.dumps(data)}")
            
        publish_id = data.get("data", {}).get("publish_id")
        logger.info(f"Successfully initiated TikTok publish for post {post.id} (publish_id: {publish_id})")
        
        return publish_id
