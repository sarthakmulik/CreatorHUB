# CreatorHub

> **A unified analytics + content scheduling platform for content creators.**
> Connect YouTube, Instagram, TikTok and more in one beautiful dark-mode dashboard.

---

## 🚀 Quick Start (Mock Mode — No API Keys Needed)

The app ships with a full **mock mode** that shows realistic YouTube analytics data without any real credentials. You can explore the entire UI immediately.

```bash
# 1. Clone / open the project
cd c:\CreatorHUB

# 2. Start the frontend
cd frontend
npm install        # already done during setup
npm run dev

# 3. Open in browser
# → http://localhost:3000
```

That's it! The dashboard loads with demo data.

---

## 📁 Project Structure

```
CreatorHUB/
├── frontend/          # Next.js 14 (App Router) + Tailwind CSS
│   ├── app/
│   │   ├── (auth)/    # Login & Signup pages
│   │   └── (dashboard)/  # Dashboard, Calendar, Insights, Settings
│   ├── components/    # Sidebar, StatCard, GrowthChart, VideoTable
│   └── lib/           # Mock data, utilities
│
└── backend/           # FastAPI (Python)
    ├── app/
    │   ├── models/    # SQLAlchemy ORM models
    │   ├── schemas/   # Pydantic request/response schemas
    │   ├── routers/   # YouTube + Dashboard API routes
    │   └── services/  # YouTube API, AES-256 token encryption
    └── requirements.txt
```

---

## 🔧 Full Setup (Real YouTube Data)

### Prerequisites
- Node.js 18+
- Python 3.11+
- A [Supabase](https://supabase.com) project (free tier is fine)
- A [Google Cloud](https://console.cloud.google.com) project

---

### Step 1 — Supabase

1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy **Project URL** and **anon key** from Settings → API
3. Also copy the **service_role key** (keep this secret!)
4. Copy the **database connection string** from Settings → Database → Connection string → URI

---

### Step 2 — Google Cloud / YouTube API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable the **YouTube Data API v3**:
   - APIs & Services → Library → Search "YouTube Data API v3" → Enable
4. Create OAuth 2.0 credentials:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:8000/api/youtube/callback`
   - Copy the **Client ID** and **Client Secret**

---

### Step 3 — Backend Setup

```bash
cd c:\CreatorHUB\backend

# Copy env file
copy .env.example .env
# Edit .env and fill in all values

# Create virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Generate encryption key
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Copy the output into ENCRYPTION_KEY in .env

# Run database migrations (requires DATABASE_URL in .env)
alembic upgrade head

# Start the backend
uvicorn app.main:app --reload --port 8000
```

Backend runs at: http://localhost:8000  
API docs: http://localhost:8000/docs

---

### Step 4 — Frontend Setup

```bash
cd c:\CreatorHUB\frontend

# Copy env file
copy .env.local.example .env.local
# Edit .env.local:
#   NEXT_PUBLIC_SUPABASE_URL=<your supabase url>
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your supabase anon key>
#   NEXT_PUBLIC_MOCK_MODE=false   ← set to false for real data

npm run dev
```

Frontend runs at: http://localhost:3000

---

## 🗺️ Pages

| Route | Description |
|-------|-------------|
| `/` | Redirects to `/dashboard` |
| `/login` | Login with email or Google |
| `/signup` | Create account |
| `/dashboard` | Main analytics dashboard |
| `/calendar` | Content scheduling calendar (Phase 4) |
| `/insights` | AI-powered insights (Phase 5) |
| `/settings` | Connect social accounts, profile |

---

## 🎯 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/youtube/auth-url?user_id=` | Get Google OAuth URL |
| GET | `/api/youtube/callback` | OAuth callback handler |
| GET | `/api/youtube/connect-mock?user_id=` | Connect mock YouTube account |
| GET | `/api/youtube/videos/{account_id}` | Get stored videos |
| POST | `/api/youtube/sync/{account_id}` | Trigger data sync |
| GET | `/api/dashboard/stats?user_id=` | Aggregate platform stats |
| GET | `/api/dashboard/growth?user_id=&days=30` | Growth chart data |

---

## 🔐 Security

- OAuth tokens stored **AES-256 (Fernet) encrypted** — never in plaintext
- Only **read-only** YouTube scopes requested — CreatorHub never posts on your behalf
- Supabase RLS policies protect per-user data (Phase 0 backend) 
- CORS restricted to `localhost:3000` in dev

---

## 📅 Build Phases

| Phase | Status | Scope |
|-------|--------|-------|
| **Phase 0** | ✅ Complete | Foundation, auth, dashboard shell |
| **Phase 1** | ✅ Complete | YouTube integration, video stats |
| Phase 2 | 🚧 Next | Growth charts backfill, daily sync job (Celery) |
| Phase 3 | 📋 Planned | Instagram + TikTok integration |
| Phase 4 | 📋 Planned | Content calendar, post scheduling |
| Phase 5 | 📋 Planned | AI insights (GPT-4 / Claude) |
| Phase 6 | 📋 Planned | Polish, PDF export, onboarding |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| Auth | Supabase Auth |
| Backend | FastAPI (Python 3.11) |
| Database | PostgreSQL via Supabase |
| ORM | SQLAlchemy 2.0 + Alembic |
| Encryption | cryptography (Fernet / AES-256) |
| API Client | httpx (async) |

---

## 🤝 Next Prompt (Phase 2)

When you're ready to continue, use this prompt:

> You are building **CreatorHub**. Phase 0 and Phase 1 are complete (see `1-REQUIREMENTS.md` and `2-PLAN.md`). Build **Phase 2**: implement a Celery + Redis background job that runs daily to snapshot all connected accounts' stats into `daily_snapshots`, and backfill 30 days of mock historical data for newly connected accounts so growth charts are populated immediately.
