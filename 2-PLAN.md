# PLAN.md — CreatorHub

## 1. Tech Stack
- **Frontend**: React (Next.js) + Tailwind CSS, Recharts for charts
- **Backend**: FastAPI (Python) — chosen for easy future ML/AI insight work in the same stack
- **Database**: PostgreSQL (time-series-friendly schema for daily snapshots)
- **Auth**: Supabase Auth (email/password + Google OAuth)
- **Job scheduling**: Celery + Redis (for daily data sync jobs and scheduled post publishing)
- **Hosting**: Frontend on Vercel, backend on Railway/Render, DB on Supabase or Neon

## 2. Data Model (high level)
- `users` — id, email, created_at
- `connected_accounts` — id, user_id, platform, oauth_token (encrypted), refresh_token (encrypted), token_expires_at, platform_account_id
- `daily_snapshots` — id, connected_account_id, date, followers, views, likes, comments
- `posts` — id, connected_account_id, platform_post_id, title/caption, published_at, views, likes, comments, shares
- `scheduled_posts` — id, user_id, target_platforms[], caption, media_url, scheduled_time, status (draft/queued/published/failed)
- `ai_insights` — id, user_id, generated_at, insight_text, supporting_metric_refs

## 3. Build Phases

### Phase 0 — Foundation (Week 1)
- Set up repo, CI, Supabase project, empty Next.js + FastAPI skeleton
- Auth: signup/login/logout working end-to-end
- Empty dashboard shell with sidebar nav (Dashboard / Calendar / Insights / Settings)

### Phase 1 — YouTube Integration (Week 2–3)
- Implement YouTube OAuth connect flow
- Backend job: fetch channel stats + last 20 videos on connect
- Store first daily snapshot
- Dashboard: show YouTube stats card + post table (real data, single platform)

### Phase 2 — Growth Charts & Daily Sync (Week 3–4)
- Celery scheduled job: daily snapshot sync for all connected accounts
- Frontend: line chart component for followers/views over time
- Date range picker on dashboard

### Phase 3 — Instagram + TikTok Integration (Week 5–7)
- Repeat Phase 1 pattern for Instagram Graph API (Business account requirement — flag this to user during connect flow)
- Repeat for TikTok for Developers API
- Merge multi-platform data into combined dashboard view (aggregate cards + per-platform toggle)

### Phase 4 — Content Calendar & Scheduling (Week 7–9)
- Build calendar UI (month/week view)
- Draft post creation form (caption, media upload to storage, target platform selection, date/time picker)
- Scheduled job that attempts to publish at the scheduled time (where platform API approval allows; otherwise mark as "ready to publish manually" with a reminder notification)

### Phase 5 — AI Insights Layer (Week 9–10)
- Weekly job: aggregate each user's post + snapshot data, send to Claude/OpenAI API with a structured prompt, store generated insight text
- Insights tab on dashboard displaying latest 3–5 insights

### Phase 6 — Polish & Launch (Week 10–12)
- Error states, loading states, empty states for zero-connected-accounts
- Basic PDF export of dashboard stats
- Onboarding flow (connect first account walkthrough)
- Deploy, test with 5–10 real creators, iterate

## 4. Risks & Mitigations
- **Platform API approval delays** (Instagram/TikTok require app review for full access) → apply for API access in Week 1, in parallel with Phase 0–1, so approval isn't a late blocker
- **Rate limits** → cache aggressively, sync once daily not on every page load
- **Token expiry handling** → build refresh-token job early (Phase 1), test it explicitly before adding more platforms

## 5. Definition of Done for MVP
All items in REQUIREMENTS.md section 6 (Success Criteria) pass in a staging environment with at least one real connected YouTube account.
