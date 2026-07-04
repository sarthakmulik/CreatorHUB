"""
CreatorHub — FastAPI entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import youtube_router, dashboard_router, instagram_router, tiktok_router, calendar_router, insights_router
from app.routers.payments import router as payments_router
from app.routers.mediakit import router as mediakit_router
from app.routers.crm import router as crm_router
from app.routers.repurpose import router as repurpose_router

settings = get_settings()

from contextlib import asynccontextmanager
from app.scheduler import start_scheduler
import logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting CreatorHub backend...")
    scheduler = start_scheduler()
    yield
    # Shutdown
    logger.info("Shutting down scheduler...")
    scheduler.shutdown(wait=False)

app = FastAPI(
    title="CreatorHub API",
    description="Backend for the CreatorHub content creator analytics platform.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000", "https://creator-hub-hheg.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(youtube_router)
app.include_router(dashboard_router)
app.include_router(instagram_router)
app.include_router(tiktok_router)
app.include_router(calendar_router)
app.include_router(insights_router, prefix="/api/insights", tags=["Insights"])
app.include_router(payments_router)
app.include_router(mediakit_router)
app.include_router(crm_router)
app.include_router(repurpose_router)


@app.get("/health")
def health_check():
    return {"status": "ok", "version": "0.1.0"}
