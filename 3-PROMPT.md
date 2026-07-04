# PROMPT.md — CreatorHub (Actual Build Prompt for AI)

> Use this prompt together with REQUIREMENTS.md and PLAN.md as context. Paste all three into the AI tool (or attach as files) before asking it to start building.

---

## Prompt

You are building **CreatorHub**, a web application for content creators to manage and analyze all their social media accounts in one place.

**Context**: I've attached REQUIREMENTS.md (what the product must do and why) and PLAN.md (the technical architecture and build order). Follow these as the source of truth. If anything in my instructions below conflicts with those files, the files take priority — ask me to clarify rather than guessing.

**What to build right now**: Start with **Phase 0 and Phase 1 from PLAN.md only** — do not attempt Instagram, TikTok, scheduling, or AI insights yet. Specifically:

1. Set up the project structure: Next.js + Tailwind frontend, FastAPI backend, PostgreSQL database, Supabase for auth — matching the stack in PLAN.md section 1.
2. Implement the data model for `users` and `connected_accounts` from PLAN.md section 2.
3. Build signup/login/logout using Supabase Auth (email/password + Google OAuth).
4. Build an empty dashboard shell with sidebar navigation: Dashboard / Calendar / Insights / Settings (Calendar and Insights pages can be placeholder screens for now).
5. Implement the YouTube OAuth connect flow: user clicks "Connect YouTube" on Settings, authorizes via Google OAuth with YouTube Data API v3 scope, and the app stores the encrypted token in `connected_accounts`.
6. On successful connection, fetch the channel's current subscriber count, total views, and the last 20 videos with their individual stats (views, likes, comments) using YouTube Data API v3.
7. Display this on the Dashboard: a summary card (subscribers, total views, engagement rate) and a table of the last 20 videos, sortable by views/likes/comments/date.

**Constraints**:
- Encrypt OAuth tokens at rest — do not store them in plaintext.
- Do not implement Instagram/TikTok integration yet, even as placeholders with fake data — leave those as clearly marked "Coming soon" in the Settings page.
- Follow the data model field names exactly as specified in PLAN.md so future phases plug in without a schema rewrite.
- Match the Success Criteria in REQUIREMENTS.md section 6 (item 1 and 2 specifically) — the connect flow must work end-to-end with real data, and a basic growth-over-time chart should be scaffolded (even with just one data point so far, since daily snapshots start accumulating from day one).

**Output expectations**: Working code I can run locally, with clear setup instructions (env variables needed for Supabase and YouTube API credentials, how to run frontend/backend, how to run migrations).

Once this is working, I'll come back with the next prompt for Phase 2 (growth chart backfill + daily sync job).

---

## How to Use These 3 Files Together

1. **REQUIREMENTS.md** — paste/attach first. This tells the AI *what* and *why*. It prevents scope creep and keeps every later prompt anchored to the same product vision.
2. **PLAN.md** — paste/attach second. This tells the AI *how* — the stack, data model, and phase-by-phase order. It stops the AI from inventing its own architecture each session or jumping straight to a "full app" that's shallow everywhere.
3. **PROMPT.md** — this is the actual instruction, scoped to *one phase at a time*. Reusing this pattern, you write a new short prompt for each phase (Phase 2, Phase 3...) that references the same two context files, so the AI never loses the thread even across many separate sessions.

This mirrors the reel's advice: requirements = scope/why, plan = architecture/how, prompt = the specific ask — feeding all three gives the AI full context instead of a vague one-liner.
