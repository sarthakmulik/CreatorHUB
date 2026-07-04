import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, DateTime, Integer, BigInteger,
    Float, Text, ForeignKey, Enum as SAEnum, ARRAY
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class SubscriptionTier(str, enum.Enum):
    free = "free"
    pro = "pro"
    elite = "elite"



class PlatformEnum(str, enum.Enum):
    youtube = "youtube"
    instagram = "instagram"
    tiktok = "tiktok"
    twitter = "twitter"
    facebook = "facebook"
    linkedin = "linkedin"
    snapchat = "snapchat"


class ScheduledPostStatus(str, enum.Enum):
    draft = "draft"
    queued = "queued"
    published = "published"
    failed = "failed"


class User(Base):
    """
    Mirror of Supabase auth.users — stores app-level profile data.
    The authoritative identity lives in Supabase Auth.
    """
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(320), unique=True, nullable=False, index=True)
    display_name = Column(String(200), nullable=True)
    avatar_url = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    subscription_tier = Column(SAEnum(SubscriptionTier), default=SubscriptionTier.free, nullable=False)
    niche_cpm = Column(Float, default=10.0, nullable=False)
    razorpay_customer_id = Column(String(200), nullable=True)
    razorpay_subscription_id = Column(String(200), nullable=True)

    connected_accounts = relationship("ConnectedAccount", back_populates="user", cascade="all, delete-orphan")
    scheduled_posts = relationship("ScheduledPost", back_populates="user", cascade="all, delete-orphan")
    ai_insights = relationship("AIInsight", back_populates="user", cascade="all, delete-orphan")


class ConnectedAccount(Base):
    """
    One row per platform OAuth connection per user.
    Tokens are AES-256 (Fernet) encrypted at rest.
    """
    __tablename__ = "connected_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    platform = Column(SAEnum(PlatformEnum), nullable=False)
    # Encrypted with Fernet (symmetric AES-128-CBC + HMAC-SHA256)
    oauth_token = Column(Text, nullable=False)        # encrypted access token
    refresh_token = Column(Text, nullable=True)       # encrypted refresh token
    token_expires_at = Column(DateTime, nullable=True)
    platform_account_id = Column(String(200), nullable=False)  # e.g. YouTube channel ID
    platform_account_name = Column(String(200), nullable=True)
    platform_account_avatar = Column(Text, nullable=True)
    connected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_synced_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="connected_accounts")
    daily_snapshots = relationship("DailySnapshot", back_populates="connected_account", cascade="all, delete-orphan")
    posts = relationship("Post", back_populates="connected_account", cascade="all, delete-orphan")


class DailySnapshot(Base):
    """
    One row per connected account per day — enables growth-over-time charts.
    """
    __tablename__ = "daily_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connected_account_id = Column(UUID(as_uuid=True), ForeignKey("connected_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(DateTime, nullable=False, index=True)
    followers = Column(BigInteger, default=0)
    views = Column(BigInteger, default=0)
    likes = Column(BigInteger, default=0)
    comments = Column(BigInteger, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    connected_account = relationship("ConnectedAccount", back_populates="daily_snapshots")


class Post(Base):
    """
    Represents a published post fetched from a connected platform.
    """
    __tablename__ = "posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connected_account_id = Column(UUID(as_uuid=True), ForeignKey("connected_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    platform_post_id = Column(String(200), nullable=False)  # e.g. YouTube video ID
    title = Column(Text, nullable=True)
    caption = Column(Text, nullable=True)
    thumbnail_url = Column(Text, nullable=True)
    published_at = Column(DateTime, nullable=True, index=True)
    views = Column(BigInteger, default=0)
    likes = Column(BigInteger, default=0)
    comments = Column(BigInteger, default=0)
    shares = Column(BigInteger, default=0)
    duration_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    connected_account = relationship("ConnectedAccount", back_populates="posts")


class ScheduledPost(Base):
    """
    User-created draft/scheduled post for future publishing.
    """
    __tablename__ = "scheduled_posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    target_platforms = Column(ARRAY(String), nullable=False, default=[])
    caption = Column(Text, nullable=True)
    media_url = Column(Text, nullable=True)
    thumbnail_url = Column(Text, nullable=True)
    platform_metadata = Column(postgresql.JSONB, nullable=True, default={})
    scheduled_time = Column(DateTime, nullable=False)
    status = Column(SAEnum(ScheduledPostStatus), default=ScheduledPostStatus.draft, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="scheduled_posts")


class AIInsight(Base):
    """
    AI-generated weekly insight text for a user.
    """
    __tablename__ = "ai_insights"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    insight_text = Column(Text, nullable=False)
    supporting_metric_refs = Column(Text, nullable=True)  # JSON string of referenced metric IDs

    user = relationship("User", back_populates="ai_insights")


class RepurposedVideoStatus(str, enum.Enum):
    processing = "processing"
    completed = "completed"
    failed = "failed"

class RepurposedVideo(Base):
    """
    Tracks AI repurposed vertical videos from long-form content.
    """
    __tablename__ = "repurposed_videos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    original_video_url = Column(Text, nullable=False)
    clipped_video_url = Column(Text, nullable=True)
    status = Column(SAEnum(RepurposedVideoStatus), default=RepurposedVideoStatus.processing, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="repurposed_videos")


class CommentCategory(str, enum.Enum):
    question = "question"
    collab = "collab"
    positive = "positive"
    negative = "negative"
    other = "other"

class Comment(Base):
    """
    Fetched comments analyzed for sentiment and CRM categorization.
    """
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    author_name = Column(String(200), nullable=True)
    author_profile_url = Column(Text, nullable=True)
    text = Column(Text, nullable=False)
    sentiment_score = Column(Float, nullable=True)
    category = Column(SAEnum(CommentCategory), default=CommentCategory.other, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("Post", backref="comments")

