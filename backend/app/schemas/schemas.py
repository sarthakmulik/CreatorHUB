from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, EmailStr


# ─── User ─────────────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    email: EmailStr
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    pass


class UserOut(UserBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Connected Account ────────────────────────────────────────────────────────

class ConnectedAccountOut(BaseModel):
    id: UUID
    platform: str
    platform_account_id: str
    platform_account_name: Optional[str]
    platform_account_avatar: Optional[str]
    connected_at: datetime
    last_synced_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Dashboard Stats ──────────────────────────────────────────────────────────

class PlatformStats(BaseModel):
    platform: str
    account_name: str
    account_avatar: Optional[str]
    subscribers: int
    total_views: int
    engagement_rate: float
    connected_account_id: str


class DashboardStats(BaseModel):
    total_followers: int
    total_views: int
    engagement_rate: float
    platforms: List[PlatformStats]


# ─── Post / Video ─────────────────────────────────────────────────────────────

class PostOut(BaseModel):
    id: UUID
    platform_post_id: str
    title: Optional[str]
    thumbnail_url: Optional[str]
    published_at: Optional[datetime]
    views: int
    likes: int
    comments: int
    shares: int
    duration_seconds: Optional[int]

    class Config:
        from_attributes = True


# ─── Growth Chart ─────────────────────────────────────────────────────────────

class SnapshotPoint(BaseModel):
    date: str
    followers: int
    views: int


class GrowthChartData(BaseModel):
    platform: str
    account_name: str
    snapshots: List[SnapshotPoint]


# ─── YouTube Connect ──────────────────────────────────────────────────────────

class YouTubeAuthUrlResponse(BaseModel):
    auth_url: str


class YouTubeConnectResponse(BaseModel):
    account: ConnectedAccountOut
    channel_name: str
    subscribers: int
    total_views: int
    videos: List[PostOut]


# ─── Scheduled Post ───────────────────────────────────────────────────────────

class ScheduledPostBase(BaseModel):
    target_platforms: List[str]
    caption: Optional[str] = None
    media_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    platform_metadata: Optional[dict] = None
    scheduled_time: datetime

class ScheduledPostCreate(ScheduledPostBase):
    pass

class ScheduledPostUpdate(BaseModel):
    target_platforms: Optional[List[str]] = None
    caption: Optional[str] = None
    media_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    status: Optional[str] = None

class ScheduledPostOut(ScheduledPostBase):
    id: UUID
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
