import urllib.parse
import logging
from datetime import datetime, timedelta
import httpx
import asyncio
from sqlalchemy.orm import Session
from app.config import get_settings
from app.models.models import (
    ConnectedAccount, DailySnapshot, Post, PostInsight, AudienceSnapshot,
    PlatformEnum, User,
)
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

        if data:
            # Process sequentially to avoid 429 Rate Limiting from FB Graph API
            for item in data:
                await fetch_deep_insights(client, item, access_token)

        return data


# Metric sets per media_product_type. Requesting the wrong set throws a 400,
# so we dispatch by product type instead of the old trial-and-error loop.
_INSIGHT_METRIC_SETS = {
    "REELS": "reach,impressions,likes,comments,shares,saves,replies,total_views,video_views,profile_visits",
    "FEED":  "reach,impressions,engagement,saved,likes,comments,profile_visits,video_views",
    "STORY": "impressions,reach,taps_forward,taps_back,replies,exits,profile_visits",
    # Fallback for any other type (e.g. AD) — reach/impressions are universal
    "FALLBACK": "reach,impressions",
}


async def fetch_deep_insights(client: httpx.AsyncClient, item: dict, access_token: str) -> dict:
    """
    Fetch the full insight metric set for a single media item, keyed to its
    media_product_type. Populates item["views"] (for back-compat with the
    existing Post-sync logic) AND item["insights"] (full metric dict for
    PostInsight storage).
    """
    item["views"] = 0
    item["insights"] = {}
    product_type = item.get("media_product_type") or "FALLBACK"
    metric_param = _INSIGHT_METRIC_SETS.get(product_type, _INSIGHT_METRIC_SETS["FALLBACK"])

    try:
        resp = await client.get(
            f"{GRAPH_API_BASE}/{item['id']}/insights",
            params={"metric": metric_param, "access_token": access_token}
        )
        if resp.status_code != 200:
            # Some metrics are only valid for certain media (e.g. video_views on a
            # video FEED post). The API may 400 the whole batch if ONE is invalid.
            # Retry with the universal fallback so we at least get reach/impressions.
            logging.getLogger(__name__).warning(
                f"IG deep insights {resp.status_code} for {item['id']} ({product_type}); retrying fallback. body={resp.text[:200]}"
            )
            resp = await client.get(
                f"{GRAPH_API_BASE}/{item['id']}/insights",
                params={"metric": _INSIGHT_METRIC_SETS["FALLBACK"], "access_token": access_token}
            )

        if resp.status_code == 200:
            for entry in resp.json().get("data", []):
                name = entry.get("name")
                values = entry.get("values", [])
                value = values[0]["value"] if values else 0
                item["insights"][name] = value
                # Back-compat: views = plays (reels) > video_views > impressions
                if name in ("total_views", "plays", "video_views") and item["views"] < value:
                    item["views"] = value
    except Exception as e:
        logging.getLogger(__name__).warning(f"IG insights fetch failed for {item['id']}: {e}")

    return item


async def fetch_audience_demographics(access_token: str, ig_account_id: str) -> dict:
    """
    Fetch the lifetime audience breakdown for an IG Business account:
    gender/age distribution, top cities, and top countries.
    Returns {"gender_age": [...], "cities": [...], "countries": [...]}.
    """
    result = {"gender_age": [], "cities": [], "countries": []}
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(
                f"{GRAPH_API_BASE}/{ig_account_id}/insights",
                params={
                    "metric": "audience_gender_age,audience_city,audience_country",
                    "period": "lifetime",
                    "access_token": access_token,
                },
            )
            if resp.status_code != 200:
                logging.getLogger(__name__).warning(
                    f"IG audience demographics {resp.status_code}: {resp.text[:200]}"
                )
                return result

            for entry in resp.json().get("data", []):
                name = entry.get("name")
                values = entry.get("values", [])
                items = values[0].get("value", []) if values else []
                if name == "audience_gender_age":
                    result["gender_age"] = items
                elif name == "audience_city":
                    result["cities"] = items
                elif name == "audience_country":
                    result["countries"] = items
        except Exception as e:
            logging.getLogger(__name__).warning(f"IG audience demographics fetch failed: {e}")

    return result


async def fetch_audience_online(access_token: str, ig_account_id: str) -> dict:
    """
    Fetch the lifetime online_followers metric for an IG Business account.
    Returns dict mapping hour (in PST/PDT per Graph API) to value.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(
                f"{GRAPH_API_BASE}/{ig_account_id}/insights",
                params={
                    "metric": "online_followers",
                    "period": "lifetime",
                    "access_token": access_token,
                },
            )
            if resp.status_code != 200:
                logging.getLogger(__name__).warning(f"IG online_followers {resp.status_code}: {resp.text[:200]}")
                return {}

            for entry in resp.json().get("data", []):
                if entry.get("name") == "online_followers":
                    values = entry.get("values", [])
                    if values and "value" in values[0]:
                        return values[0]["value"] # e.g. {"0": 100, "1": 150, ...} 0-23 PST
        except Exception as e:
            logging.getLogger(__name__).warning(f"IG online_followers fetch failed: {e}")
    return {}


async def _persist_audience_online(db: Session, access_token: str, ig_account_id: str, connected_account_id) -> None:
    """Fetch IG online followers, convert PST to IST (+13.5 hours -> +13 shift for simple buckets), and store in AudienceOnline."""
    try:
        from app.models.models import AudienceOnline
        pst_data = await fetch_audience_online(access_token, ig_account_id)
        if not pst_data:
            return
            
        ist_data = {}
        total_weight = 0
        for pst_hour_str, count in pst_data.items():
            pst_hour = int(pst_hour_str)
            # PST to IST is +13.5 hours. We'll shift the hour bucket by 13.
            ist_hour = (pst_hour + 13) % 24
            ist_data[ist_hour] = ist_data.get(ist_hour, 0) + count
            total_weight += count

        if total_weight == 0:
            return

        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Clear existing for today
        db.query(AudienceOnline).filter_by(connected_account_id=connected_account_id, date=today).delete()
        
        # Insert new
        for ist_hour, count in ist_data.items():
            weight = count / total_weight
            db.add(AudienceOnline(
                connected_account_id=connected_account_id,
                date=today,
                hour_ist=ist_hour,
                weight=weight
            ))
    except Exception as e:
        logging.getLogger(__name__).warning(f"Failed to persist audience online: {e}")


def _upsert_post_insight(db: Session, post: Post, item: dict) -> None:
    """Create or update the PostInsight row for a post from a fetched IG media item."""
    insights = item.get("insights") or {}
    if not insights:
        return
    existing = post.insight
    if existing:
        existing.metrics = insights
        existing.media_product_type = item.get("media_product_type")
    else:
        db.add(PostInsight(
            post_id=post.id,
            metrics=insights,
            media_product_type=item.get("media_product_type"),
        ))


async def _persist_audience_snapshot(db: Session, access_token: str, ig_account_id: str, connected_account_id) -> None:
    """Fetch IG audience demographics and store today's AudienceSnapshot row."""
    try:
        demographics = await fetch_audience_demographics(access_token, ig_account_id)
        if not any(demographics.values()):
            return  # API returned nothing usable
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        existing = db.query(AudienceSnapshot).filter_by(
            connected_account_id=connected_account_id, date=today
        ).first()
        if existing:
            existing.demographics = demographics
        else:
            db.add(AudienceSnapshot(
                connected_account_id=connected_account_id,
                date=today,
                demographics=demographics,
            ))
    except Exception as e:
        logging.getLogger(__name__).warning(f"Failed to persist audience snapshot: {e}")


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
        db.flush()
        _upsert_post_insight(db, post, item)

    # Persist today's audience demographics snapshot
    await _persist_audience_snapshot(db, access_token_plain, account.platform_account_id, account.id)
    
    # Persist online audience (Best Time to Post)
    await _persist_audience_online(db, access_token_plain, account.platform_account_id, account.id)

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


async def refresh_long_lived_token(db: Session, account: ConnectedAccount):
    from app.config import get_settings
    settings = get_settings()
    access_token_plain = decrypt_token(account.oauth_token)
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GRAPH_API_BASE}/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": settings.facebook_client_id,
                    "client_secret": settings.facebook_client_secret,
                    "fb_exchange_token": access_token_plain,
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                new_token = data.get("access_token")
                if new_token:
                    expires_in = data.get("expires_in", 60 * 60 * 24 * 60)
                    account.oauth_token = encrypt_token(new_token)
                    account.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
                    db.commit()
                    logging.getLogger(__name__).info(f"Refreshed IG token for {account.id}")
            else:
                logging.getLogger(__name__).error(f"Failed to refresh IG token for {account.id}: {resp.text}")
    except Exception as e:
        logging.getLogger(__name__).error(f"Error refreshing IG token for {account.id}: {e}")

async def fetch_ig_comments(media_id: str, access_token: str) -> list[dict]:
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GRAPH_API_BASE}/{media_id}/comments",
                params={"access_token": access_token}
            )
            if resp.status_code == 200:
                return resp.json().get("data", [])
    except Exception as e:
        logging.getLogger(__name__).warning(f"IG comments fetch failed for {media_id}: {e}")
    return []

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
            db.flush()
            _upsert_post_insight(db, post, item)
            
            # Stage 3: Fetch and store real comments
            if post.comments > 0:
                comments_data = await fetch_ig_comments(pid, access_token_plain)
                from app.models.models import Comment
                existing_comments = {c.platform_comment_id: c for c in db.query(Comment).filter_by(post_id=post.id).all()}
                for c_item in comments_data:
                    c_id = c_item.get("id")
                    if not c_id or c_id in existing_comments:
                        continue
                    db.add(Comment(
                        post_id=post.id,
                        platform_comment_id=c_id,
                        author_name=c_item.get("username", "Instagram User"),
                        text=c_item.get("text", "")
                    ))
                db.flush()

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

        # Refresh today's audience demographics snapshot (cheap, lifetime window)
        await _persist_audience_snapshot(db, access_token_plain, account.platform_account_id, account.id)
        
        # Refresh online audience (Best Time to Post)
        await _persist_audience_online(db, access_token_plain, account.platform_account_id, account.id)

        account.last_synced_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        logging.getLogger(__name__).error(f"Failed to sync Instagram account {account.id}: {e}")
        db.rollback()
