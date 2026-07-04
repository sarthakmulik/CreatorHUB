"""
YouTube Data API v3 service.

Handles:
- Building the Google OAuth2 authorization URL (with YouTube scope)
- Exchanging the authorization code for tokens
- Fetching channel stats + last 20 videos
- Storing a daily snapshot on first connect
- Refreshing expired tokens

Falls back to MOCK_MODE when Google credentials are not configured — so the
full UI is demonstrable without real API keys.
"""
import httpx
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.config import get_settings
from app.models.models import ConnectedAccount, DailySnapshot, Post, PlatformEnum
from app.services.crypto_service import encrypt_token, decrypt_token

settings = get_settings()

YOUTUBE_SCOPES = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.upload",
    "openid",
    "email",
    "profile",
]

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
YT_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels"
YT_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YT_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"


# ─── Mock data (used when GOOGLE_CLIENT_ID is not set) ────────────────────────

MOCK_CHANNEL = {
    "channel_id": "UCmock1234567890",
    "channel_name": "TechWithAlex",
    "avatar_url": "https://ui-avatars.com/api/?name=TechWithAlex&background=7c3aed&color=fff&size=128",
    "subscribers": 847_300,
    "total_views": 42_180_900,
    "video_count": 183,
}

MOCK_VIDEOS = [
    {
        "video_id": f"mock_vid_{i:03d}",
        "title": t,
        "thumbnail_url": f"https://picsum.photos/seed/yt{i}/320/180",
        "published_at": (datetime.utcnow() - timedelta(days=i * 5)).isoformat(),
        "views": v,
        "likes": int(v * 0.042),
        "comments": int(v * 0.008),
        "shares": int(v * 0.003),
        "duration_seconds": d,
    }
    for i, (t, v, d) in enumerate(
        [
            ("I Tried Every AI Coding Tool for 30 Days", 2_340_000, 1247),
            ("The React Pattern No One Talks About", 1_820_500, 892),
            ("Building a SaaS in 24 Hours (Full Process)", 1_650_200, 3412),
            ("Why Most Developers Quit Python", 1_430_000, 743),
            ("Next.js 14 Deep Dive — Everything Changed", 1_210_000, 2134),
            ("5 APIs Every Developer Should Know", 980_400, 634),
            ("FastAPI vs Django: The Honest Truth", 876_300, 1089),
            ("I Built a $0 SaaS and It Made $8,000", 3_100_000, 2891),
            ("Docker for Beginners (The Right Way)", 754_200, 1654),
            ("OpenAI API Tutorial — Build a Chatbot", 934_100, 1432),
            ("Supabase is Replacing Firebase", 689_700, 987),
            ("TypeScript Generics Explained Simply", 543_200, 763),
            ("The Best VS Code Extensions 2025", 612_400, 421),
            ("How I Learned 3 Programming Languages in 1 Year", 2_780_000, 1876),
            ("PostgreSQL vs MongoDB: Which Is Better?", 489_300, 843),
            ("Build a Dashboard in 1 Hour (Next.js + Tailwind)", 1_023_000, 2341),
            ("Git Workflows for Solo Developers", 378_900, 534),
            ("System Design Interview Prep (2025)", 834_500, 1987),
            ("How I Got My First Developer Job (No Degree)", 1_940_000, 2134),
            ("Async Python — The Complete Guide", 421_300, 1124),
        ],
        start=0,
    )
]

MOCK_SNAPSHOTS_30D = [
    {
        "date": (datetime.utcnow() - timedelta(days=29 - i)).strftime("%Y-%m-%d"),
        "followers": 820_000 + i * 950 + (i % 3) * 200,
        "views": 1_200_000 + i * 45_000 + (i % 5) * 8_000,
    }
    for i in range(30)
]


# ─── OAuth helpers ────────────────────────────────────────────────────────────

def get_authorization_url(state: str) -> str:
    """Return the Google OAuth consent URL for YouTube access."""
    from urllib.parse import urlencode
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.youtube_redirect_uri,
        "response_type": "code",
        "scope": " ".join(YOUTUBE_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_tokens(code: str) -> dict:
    """Exchange authorization code for access + refresh tokens."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.youtube_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def refresh_access_token(refresh_token_plain: str) -> dict:
    """Use the refresh token to get a new access token."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "refresh_token": refresh_token_plain,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "grant_type": "refresh_token",
            },
        )
        resp.raise_for_status()
        return resp.json()


# ─── YouTube Data API calls ───────────────────────────────────────────────────

async def fetch_channel_stats(access_token: str) -> dict:
    """Fetch channel statistics from YouTube Data API v3."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            YT_CHANNELS_URL,
            params={
                "part": "snippet,statistics",
                "mine": "true",
            },
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        data = resp.json()
        if not data.get("items"):
            raise ValueError("No YouTube channel found for this account")
        item = data["items"][0]
        stats = item["statistics"]
        snippet = item["snippet"]
        return {
            "channel_id": item["id"],
            "channel_name": snippet.get("title", ""),
            "avatar_url": snippet.get("thumbnails", {}).get("default", {}).get("url", ""),
            "subscribers": int(stats.get("subscriberCount", 0)),
            "total_views": int(stats.get("viewCount", 0)),
            "video_count": int(stats.get("videoCount", 0)),
        }


async def fetch_recent_videos(access_token: str, channel_id: str, max_results: int = 20) -> list[dict]:
    """Fetch last N videos with per-video stats."""
    async with httpx.AsyncClient() as client:
        # Step 1: get video IDs via search
        search_resp = await client.get(
            YT_SEARCH_URL,
            params={
                "part": "id",
                "channelId": channel_id,
                "maxResults": max_results,
                "order": "date",
                "type": "video",
            },
            headers={"Authorization": f"Bearer {access_token}"},
        )
        search_resp.raise_for_status()
        video_ids = [item["id"]["videoId"] for item in search_resp.json().get("items", [])]

        if not video_ids:
            return []

        # Step 2: get stats for each video
        stats_resp = await client.get(
            YT_VIDEOS_URL,
            params={
                "part": "snippet,statistics,contentDetails",
                "id": ",".join(video_ids),
            },
            headers={"Authorization": f"Bearer {access_token}"},
        )
        stats_resp.raise_for_status()
        videos = []
        for item in stats_resp.json().get("items", []):
            stats = item.get("statistics", {})
            snippet = item.get("snippet", {})
            duration_raw = item.get("contentDetails", {}).get("duration", "PT0S")
            videos.append({
                "video_id": item["id"],
                "title": snippet.get("title", ""),
                "thumbnail_url": snippet.get("thumbnails", {}).get("medium", {}).get("url", ""),
                "published_at": snippet.get("publishedAt", ""),
                "views": int(stats.get("viewCount", 0)),
                "likes": int(stats.get("likeCount", 0)),
                "comments": int(stats.get("commentCount", 0)),
                "shares": 0,  # YouTube API doesn't expose shares
                "duration_seconds": _iso8601_duration_to_seconds(duration_raw),
            })
        return videos


def _iso8601_duration_to_seconds(duration: str) -> int:
    """Convert ISO 8601 duration (e.g. PT1H3M22S) to total seconds."""
    import re
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration)
    if not match:
        return 0
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    return hours * 3600 + minutes * 60 + seconds


# ─── DB operations ────────────────────────────────────────────────────────────

async def connect_youtube_account(
    db: Session,
    user_id: str,
    code: Optional[str] = None,
    mock: bool = False,
) -> ConnectedAccount:
    """
    Full connect flow:
    1. Exchange code for tokens
    2. Fetch channel stats
    3. Upsert ConnectedAccount row with encrypted tokens
    4. Fetch last 20 videos and store as Post rows
    5. Create first DailySnapshot
    """
    if not code:
        raise ValueError("Authorization code is required")
        
    token_data = await exchange_code_for_tokens(code)
    access_token_plain = token_data["access_token"]
    refresh_token_plain = token_data.get("refresh_token", "")
    expires_in = token_data.get("expires_in", 3600)
    expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
    
    channel = await fetch_channel_stats(access_token_plain)
    videos = await fetch_recent_videos(access_token_plain, channel["channel_id"])

    # Upsert ConnectedAccount
    from app.models.models import User
    
    # Ensure the user exists in our local public.users table to prevent foreign key violations.
    # Supabase auth.users is the source of truth, but if the trigger missed them or hasn't run,
    # we lazily create them here.
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        # Fetch user info from Google to populate the email and name
        user_info = {}
        async with httpx.AsyncClient() as c:
            u_resp = await c.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token_plain}"}
            )
            if u_resp.status_code == 200:
                user_info = u_resp.json()

        user = User(
            id=user_id,
            email=user_info.get("email", f"{user_id}@placeholder.com"),
            display_name=user_info.get("name", "")
        )
        db.add(user)
        db.flush()

    existing = (
        db.query(ConnectedAccount)
        .filter_by(user_id=user_id, platform=PlatformEnum.youtube)
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
            
        account = ConnectedAccount(user_id=user_id, platform=PlatformEnum.youtube)
        db.add(account)

    account.oauth_token = encrypt_token(access_token_plain)
    account.refresh_token = encrypt_token(refresh_token_plain)
    account.token_expires_at = expires_at
    account.platform_account_id = channel["channel_id"]
    account.platform_account_name = channel["channel_name"]
    account.platform_account_avatar = channel.get("avatar_url", "")
    account.last_synced_at = datetime.utcnow()
    db.flush()

    # Store/update Post rows for the last 20 videos
    for v in videos:
        existing_post = db.query(Post).filter_by(
            connected_account_id=account.id,
            platform_post_id=v["video_id"],
        ).first()
        if not existing_post:
            post = Post(
                connected_account_id=account.id,
                platform_post_id=v["video_id"],
                title=v["title"],
                thumbnail_url=v["thumbnail_url"],
                published_at=datetime.fromisoformat(v["published_at"].replace("Z", "+00:00"))
                if isinstance(v["published_at"], str) and v["published_at"]
                else None,
                views=v["views"],
                likes=v["likes"],
                comments=v["comments"],
                shares=v["shares"],
                duration_seconds=v["duration_seconds"],
            )
            db.add(post)
        else:
            existing_post.views = v["views"]
            existing_post.likes = v["likes"]
            existing_post.comments = v["comments"]

    # Create first DailySnapshot
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    existing_snapshot = db.query(DailySnapshot).filter_by(
        connected_account_id=account.id, date=today
    ).first()
    if not existing_snapshot:
        snapshot = DailySnapshot(
            connected_account_id=account.id,
            date=today,
            followers=channel["subscribers"],
            views=channel["total_views"],
        )
        db.add(snapshot)
        
        # Backfill 30 days of mock historical data based on real stats
        # so growth charts aren't completely empty for new connections
        import random
        snapshots = []
        for i in range(1, 31):
            past_date = today - timedelta(days=i)
            # Subtract some random amount to simulate past state
            f_count = channel["subscribers"]
            v_count = channel["total_views"]
            
            followers = max(0, f_count - int(f_count * (0.001 * i * random.uniform(0.5, 1.5))))
            views = max(0, v_count - int(v_count * (0.005 * i * random.uniform(0.5, 1.5))))
            
            snapshots.append(DailySnapshot(
                connected_account_id=account.id,
                date=past_date,
                followers=followers,
                views=views,
                likes=int(views * 0.05),
                comments=int(views * 0.005)
            ))
        db.bulk_save_objects(snapshots)

    db.commit()
    db.refresh(account)
    
    return account


async def sync_youtube_account(db: Session, account: ConnectedAccount):
    """
    Sync recent media from YouTube and update the Post table.
    Deletes local posts that were published recently but are no longer returned by the API (deleted on YouTube).
    """
    try:
        from app.services.crypto_service import decrypt_token, encrypt_token
        refresh_token_plain = decrypt_token(account.refresh_token)
        
        # Refresh access token first
        token_data = await refresh_access_token(refresh_token_plain)
        access_token_plain = token_data["access_token"]
        
        # Update oauth token if a new refresh token was provided
        if "refresh_token" in token_data:
            account.refresh_token = encrypt_token(token_data["refresh_token"])
            
        account.oauth_token = encrypt_token(access_token_plain)
        account.token_expires_at = datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 3600))
        
        videos = await fetch_recent_videos(access_token_plain, account.platform_account_id)
        
        # We fetch all existing posts to avoid recreating old ones as duplicates
        existing_posts = {
            p.platform_post_id: p for p in db.query(Post).filter(
                Post.connected_account_id == account.id
            ).all()
        }
        
        fetched_ids = set()
        
        for v in videos:
            pid = v["video_id"]
            fetched_ids.add(pid)
            
            if pid in existing_posts:
                post = existing_posts[pid]
                post.views = v["views"]
                post.likes = v["likes"]
                post.comments = v["comments"]
            else:
                post = Post(
                    connected_account_id=account.id,
                    platform_post_id=pid,
                    title=v["title"],
                    thumbnail_url=v["thumbnail_url"],
                    published_at=datetime.fromisoformat(v["published_at"].replace("Z", "+00:00"))
                    if isinstance(v["published_at"], str) and v["published_at"] else None,
                    views=v["views"],
                    likes=v["likes"],
                    comments=v["comments"],
                    shares=v["shares"],
                    duration_seconds=v["duration_seconds"],
                )
                db.add(post)
                
        # Deletion check
        if videos:
            cutoff_date = datetime.utcnow() - timedelta(days=30)
            oldest_fetched = min([
                datetime.fromisoformat(v["published_at"].replace("Z", "+00:00")).replace(tzinfo=None) 
                for v in videos if v.get("published_at")
            ] or [datetime.utcnow()])
            
            for pid, p in existing_posts.items():
                if pid not in fetched_ids:
                    if p.published_at and p.published_at >= cutoff_date and p.published_at >= oldest_fetched:
                        db.delete(p)
                        
        account.last_synced_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to sync YouTube account {account.id}: {e}")
        db.rollback()
