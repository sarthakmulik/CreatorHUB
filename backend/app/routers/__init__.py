from app.routers.youtube import router as youtube_router
from app.routers.dashboard import router as dashboard_router
from app.routers.instagram import router as instagram_router
from app.routers.tiktok import router as tiktok_router
from app.routers.calendar import router as calendar_router
from app.routers.insights import router as insights_router

__all__ = ["youtube_router", "dashboard_router", "instagram_router", "tiktok_router", "calendar_router", "insights_router"]
