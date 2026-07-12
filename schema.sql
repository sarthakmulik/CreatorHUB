-- CreatorHub Supabase Schema (Phase 0/1/2)

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enums
CREATE TYPE platformenum AS ENUM ('youtube', 'instagram', 'tiktok', 'twitter', 'facebook', 'linkedin', 'snapchat');
CREATE TYPE scheduledpoststatus AS ENUM ('draft', 'queued', 'published', 'failed');

-- 3. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(320) NOT NULL UNIQUE,
    display_name VARCHAR(200),
    avatar_url TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX ix_users_email ON users(email);

-- 4. Connected Accounts Table
CREATE TABLE connected_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform platformenum NOT NULL,
    oauth_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITHOUT TIME ZONE,
    platform_account_id VARCHAR(200) NOT NULL,
    platform_account_name VARCHAR(200),
    platform_account_avatar TEXT,
    connected_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    last_synced_at TIMESTAMP WITHOUT TIME ZONE
);
CREATE INDEX ix_connected_accounts_user_id ON connected_accounts(user_id);

-- 5. Daily Snapshots Table
CREATE TABLE daily_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connected_account_id UUID NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
    date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    followers BIGINT DEFAULT 0,
    views BIGINT DEFAULT 0,
    likes BIGINT DEFAULT 0,
    comments BIGINT DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX ix_daily_snapshots_connected_account_id ON daily_snapshots(connected_account_id);
CREATE INDEX ix_daily_snapshots_date ON daily_snapshots(date);

-- 6. Posts Table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connected_account_id UUID NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
    platform_post_id VARCHAR(200) NOT NULL,
    title TEXT,
    caption TEXT,
    thumbnail_url TEXT,
    published_at TIMESTAMP WITHOUT TIME ZONE,
    views BIGINT DEFAULT 0,
    likes BIGINT DEFAULT 0,
    comments BIGINT DEFAULT 0,
    shares BIGINT DEFAULT 0,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX ix_posts_connected_account_id ON posts(connected_account_id);
CREATE INDEX ix_posts_published_at ON posts(published_at);

-- 7. Scheduled Posts Table
CREATE TABLE scheduled_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_platforms TEXT[] NOT NULL DEFAULT '{}',
    caption TEXT,
    media_url TEXT,
    scheduled_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    status scheduledpoststatus NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX ix_scheduled_posts_user_id ON scheduled_posts(user_id);

-- 8. AI Insights Table
CREATE TABLE ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    insight_text TEXT NOT NULL,
    supporting_metric_refs TEXT
);
CREATE INDEX ix_ai_insights_user_id ON ai_insights(user_id);

-- 9. Repurposed Videos Table
CREATE TYPE repurposedvideostatus AS ENUM ('processing', 'completed', 'failed');

CREATE TABLE repurposed_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_video_url TEXT NOT NULL,
    clipped_video_url TEXT,
    status repurposedvideostatus NOT NULL DEFAULT 'processing',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX ix_repurposed_videos_user_id ON repurposed_videos(user_id);

-- 10. Comments Table
CREATE TYPE commentcategory AS ENUM ('question', 'collab', 'positive', 'negative', 'other');

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_name VARCHAR(200),
    author_profile_url TEXT,
    text TEXT NOT NULL,
    sentiment_score FLOAT,
    category commentcategory NOT NULL DEFAULT 'other',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX ix_comments_post_id ON comments(post_id);

-- Add niche_cpm to users table
ALTER TABLE users ADD COLUMN niche_cpm FLOAT NOT NULL DEFAULT 10.0;

-- ─────────────────────────────────────────────────────────────────────────────
-- STAGE 1 — Deep Instagram Insights + Audience Demographics
-- ─────────────────────────────────────────────────────────────────────────────

-- 11. Extend daily_snapshots with IG deep metrics (aggregated per day)
ALTER TABLE daily_snapshots ADD COLUMN reach BIGINT DEFAULT 0;
ALTER TABLE daily_snapshots ADD COLUMN impressions BIGINT DEFAULT 0;
ALTER TABLE daily_snapshots ADD COLUMN saves BIGINT DEFAULT 0;
ALTER TABLE daily_snapshots ADD COLUMN shares BIGINT DEFAULT 0;
ALTER TABLE daily_snapshots ADD COLUMN replies BIGINT DEFAULT 0;

-- 12. Post Insights Table — deep per-post analytics stored as JSONB
--     (handles REELS vs FEED vs STORY metric differences gracefully)
CREATE TABLE post_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    media_product_type VARCHAR(50),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE UNIQUE INDEX ix_post_insights_post_id ON post_insights(post_id);

-- 13. Audience Snapshot Table — daily IG audience breakdown (gender/age/cities/countries)
CREATE TABLE audience_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connected_account_id UUID NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
    date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    demographics JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX ix_audience_snapshots_connected_account_id ON audience_snapshots(connected_account_id);
CREATE INDEX ix_audience_snapshots_date ON audience_snapshots(date);

-- ─────────────────────────────────────────────────────────────────────────────
-- STAGE 2 — Best-Time-to-Post Heatmap (IST)
-- ─────────────────────────────────────────────────────────────────────────────

-- 14. Audience Online Table — follower-online distribution by IST hour (0-23)
CREATE TABLE audience_online (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connected_account_id UUID NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
    date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    hour_ist INTEGER NOT NULL,  -- 0-23 (Indian Standard Time)
    weight FLOAT NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX ix_audience_online_connected_account_id ON audience_online(connected_account_id);
CREATE INDEX ix_audience_online_date ON audience_online(date);
CREATE UNIQUE INDEX ix_audience_online_account_date_hour ON audience_online(connected_account_id, date, hour_ist);



-- Stage 3 Additions
ALTER TABLE comments ADD COLUMN platform_comment_id VARCHAR(200) UNIQUE;
