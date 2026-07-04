import urllib.parse
from datetime import datetime, timedelta
import httpx
import asyncio
from sqlalchemy.orm import Session
from app.config import get_settings
from app.models.models import ConnectedAccount, DailySnapshot, Post, PlatformEnum, User
from app.services.crypto_service import encrypt_token
import random

settings = get_settings()

FB_OAUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth"
FB_TOKEN_URL = "https://graph.facebook.com/v19.0/oauth/access_token"
GRAPH_API_BASE = "https://graph.facebook.com/v19.0"

def get_authorization_url(state: str) -> str:
    params = {
        "client_id": settings.instagram_client_id,
        "redirect_uri": settings.instagram_redirect_uri,
        "state": state,
        "scope": "instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement,business_management,instagram_content_publish",
        "response_type": "code",
    }
    query = urllib.parse.urlencode(params)
    return f"{FB_OAUTH_URL}?{query}"


async def exchange_code_for_tokens(code: str) -> dict:
    async with httpx.AsyncClient() as client:
        # 1. Exchange code for short-lived token
        resp = await client.get(
            FB_TOKEN_URL,
            params={
                "client_id": settings.instagram_client_id,
                "client_secret": settings.instagram_client_secret,
                "redirect_uri": settings.instagram_redirect_uri,
                "code": code,
            },
        )
        resp.raise_for_status()
        short_lived_data = resp.json()
        short_token = short_lived_data["access_token"]
        
        # 2. Exchange short-lived token for long-lived token
        long_resp = await client.get(
            FB_TOKEN_URL,
            params={
                "grant_type": "fb_exchange_token",
                "client_id": settings.instagram_client_id,
                "client_secret": settings.instagram_client_secret,
                "fb_exchange_token": short_token,
            },
        )
        long_resp.raise_for_status()
        return long_resp.json()


async def fetch_ig_business_account(access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        # Check permissions granted
        perm_resp = await client.get(
            f"{GRAPH_API_BASE}/me/permissions",
            params={"access_token": access_token}
        )
        granted_perms = perm_resp.json().get("data", [])

        # Get user's FB pages
        pages_resp = await client.get(
            f"{GRAPH_API_BASE}/me/accounts",
            params={"access_token": access_token}
        )
        pages_resp.raise_for_status()
        pages_data = pages_resp.json()
        pages = pages_data.get("data", [])
        
        if not pages:
            import json
            debug_info = json.dumps({"pages_response": pages_data, "permissions_granted": granted_perms})
            raise ValueError(f"No Facebook Pages found. You must link an Instagram Business account to a Facebook Page. Debug Info: {debug_info}")

        ig_account_id = None
        for page in pages:
            ig_resp = await client.get(
                f"{GRAPH_API_BASE}/{page['id']}",
                params={
                    "fields": "instagram_business_account",
                    "access_token": access_token
                }
            )
            ig_data = ig_resp.json()
            if "instagram_business_account" in ig_data:
                ig_account_id = ig_data["instagram_business_account"]["id"]
                break
                
        if not ig_account_id:
            raise ValueError("No Instagram Business account found linked to your Facebook Pages.")
            
        # Get IG profile details
        profile_resp = await client.get(
            f"{GRAPH_API_BASE}/{ig_account_id}",
            params={
                "fields": "id,username,profile_picture_url,followers_count,media_count",
                "access_token": access_token
            }
        )
        profile_resp.raise_for_status()
        return profile_resp.json()


async def fetch_recent_ig_media(access_token: str, ig_account_id: str, limit: int = 20) -> list[dict]:
    async with httpx.AsyncClient() as client:
        media_resp = await client.get(
            f"{GRAPH_API_BASE}/{ig_account_id}/media",
            params={
                "fields": "id,caption,media_url,timestamp,media_type,media_product_type,like_count,comments_count",
                "limit": limit,
                "access_token": access_token
            }
        )
        media_resp.raise_for_status()
        data = media_resp.json().get("data", [])
        
        async def fetch_insights(item):
            item["views"] = 0
            
            # Different media types require different view metrics. Requesting the wrong one throws a 400.
            product_type = item.get("media_product_type", "")
            if product_type == "REELS":
                possible_metrics = ["plays", "impressions", "video_views"]
            else:
                possible_metrics = ["impressions", "video_views", "plays"]
                
            last_error = ""
            for metric in possible_metrics:
                try:
                    insights_resp = await client.get(
                        f"{GRAPH_API_BASE}/{item['id']}/insights",
                        params={"metric": metric, "access_token": access_token}
                    )
                    
                    if insights_resp.status_code == 200:
                        data = insights_resp.json().get("data", [])
                        if data and "values" in data[0] and len(data[0]["values"]) > 0:
                            item["views"] = data[0]["values"][0]["value"]
                            return item # Success!
                    else:
                        last_error = insights_resp.text
                except Exception as e:
                    last_error = str(e)
                    
            import logging
            logging.getLogger(__name__).warning(f"IG Insights Error for {item['id']}. Last error: {last_error}")
            return item

        if data:
            # Process sequentially to avoid 429 Rate Limiting from FB Graph API
            for item in data:
                await fetch_insights(item)

        return data


async def connect_instagram_account(db: Session, user_id: str, code: str) -> ConnectedAccount:
    if not code:
        raise ValueError("Authorization code is required")
        
    token_data = await exchange_code_for_tokens(code)
    access_token_plain = token_data["access_token"]
    expires_in = token_data.get("expires_in", 60 * 60 * 24 * 60) # roughly 60 days for long-lived
    expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
    
    # We also need basic user info to lazily create the User if it doesn't exist
    user_info = {}
    async with httpx.AsyncClient() as c:
        u_resp = await c.get(f"{GRAPH_API_BASE}/me", params={"fields": "id,name,email", "access_token": access_token_plain})
        if u_resp.status_code == 200:
            user_info = u_resp.json()

    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        user = User(
            id=user_id,
            email=user_info.get("email", f"{user_id}@placeholder.com"),
            display_name=user_info.get("name", "")
        )
        db.add(user)
        db.flush()

    ig_profile = await fetch_ig_business_account(access_token_plain)
    
    existing = (
        db.query(ConnectedAccount)
        .filter_by(user_id=user_id, platform=PlatformEnum.instagram)
        .first()
    )
    
    if existing:
        account = existing
    else:
        from app.models.models import SubscriptionTier
        connected_count = db.query(ConnectedAccount).filter_by(user_id=user_id).count()
        tier = getattr(user.subscription_tier, "value", user.subscription_tier)
        
        if tier == "free" and connected_count >= 1:
            raise ValueError("Free plan is limited to 1 connected account. Please upgrade to Pro.")
        if tier == "pro" and connected_count >= 3:
            raise ValueError("Pro plan is limited to 3 connected accounts. Please upgrade to Elite.")

        account = ConnectedAccount(user_id=user_id, platform=PlatformEnum.instagram)
        db.add(account)
        
    account.oauth_token = encrypt_token(access_token_plain)
    account.token_expires_at = expires_at
    account.platform_account_id = ig_profile["id"]
    account.platform_account_name = ig_profile.get("username", "")
    account.platform_account_avatar = ig_profile.get("profile_picture_url", "")
    account.last_synced_at = datetime.utcnow()
    
    db.flush()
    
    # Process recent posts
    posts_data = await fetch_recent_ig_media(access_token_plain, account.platform_account_id)
    
    existing_posts = {
        p.platform_post_id: p for p in db.query(Post).filter_by(connected_account_id=account.id).all()
    }
    
    for item in posts_data:
        pid = item["id"]
        published_at = datetime.strptime(item["timestamp"], "%Y-%m-%dT%H:%M:%S%z").replace(tzinfo=None)
        likes = item.get("like_count", 0)
        comments = item.get("comments_count", 0)
        views = item.get("views", 0)
        
        if pid in existing_posts:
            post = existing_posts[pid]
            post.likes = likes
            post.comments = comments
            post.views = views
        else:
            post = Post(
                connected_account_id=account.id,
                platform_post_id=pid,
                title=item.get("caption", "")[:200] if item.get("caption") else "",
                caption=item.get("caption", ""),
                thumbnail_url=item.get("media_url", ""),
                published_at=published_at,
                views=views,
                likes=likes,
                comments=comments,
            )
            db.add(post)
            
    # Create first snapshot
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    existing_snapshot = db.query(DailySnapshot).filter_by(
        connected_account_id=account.id, date=today
    ).first()
    
    if not existing_snapshot:
        snapshot = DailySnapshot(
            connected_account_id=account.id,
            date=today,
            followers=ig_profile.get("followers_count", 0),
            views=ig_profile.get("media_count", 0) * 100,
        )
        db.add(snapshot)

    db.commit()
    db.refresh(account)
    return account


async def sync_instagram_account(db: Session, account: ConnectedAccount):
    """
    Sync recent media from Instagram and update the Post table.
    Deletes local posts that were published recently but are no longer returned by the API (deleted on Instagram).
    """
    try:
        from app.services.crypto_service import decrypt_token
        access_token_plain = decrypt_token(account.oauth_token)
        
        posts_data = await fetch_recent_ig_media(access_token_plain, account.platform_account_id)
        
        # We fetch all existing posts to avoid recreating old ones as duplicates
        existing_posts = {
            p.platform_post_id: p for p in db.query(Post).filter(
                Post.connected_account_id == account.id
            ).all()
        }
        
        fetched_ids = set()
        
        for item in posts_data:
            pid = item["id"]
            fetched_ids.add(pid)
            published_at = datetime.strptime(item["timestamp"], "%Y-%m-%dT%H:%M:%S%z").replace(tzinfo=None)
            likes = item.get("like_count", 0)
            comments = item.get("comments_count", 0)
            views = item.get("views", 0)
            
            if pid in existing_posts:
                post = existing_posts[pid]
                post.likes = likes
                post.comments = comments
                post.views = views
            else:
                post = Post(
                    connected_account_id=account.id,
                    platform_post_id=pid,
                    title=item.get("caption", "")[:200] if item.get("caption") else "",
                    caption=item.get("caption", ""),
                    thumbnail_url=item.get("media_url", ""),
                    published_at=published_at,
                    views=views,
                    likes=likes,
                    comments=comments,
                )
                db.add(post)
                
        # Deletion check: If a post was in existing_posts (published in last 30 days) but NOT fetched, 
        # it means it was deleted on Instagram.
        if posts_data: # Only run deletion logic if the API actually returned data
            cutoff_date = datetime.utcnow() - timedelta(days=30)
            oldest_fetched_date = min([datetime.strptime(i["timestamp"], "%Y-%m-%dT%H:%M:%S%z").replace(tzinfo=None) for i in posts_data])
            for pid, p in existing_posts.items():
                if pid not in fetched_ids:
                    # If this post is newer than the oldest fetched post (and within 30 days), but wasn't fetched, it must be deleted!
                    if p.published_at and p.published_at >= cutoff_date and p.published_at >= oldest_fetched_date:
                        db.delete(p)
                        
        account.last_synced_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to sync Instagram account {account.id}: {e}")
        db.rollback()
