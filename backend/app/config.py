from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    database_url: str = ""
    redis_url: str = "redis://localhost:6379/0"
    google_client_id: str = ""
    google_client_secret: str = ""
    api_url: str = "http://localhost:8000"
    instagram_client_id: str = ""
    instagram_client_secret: str = ""
    tiktok_client_key: str = ""
    tiktok_client_secret: str = ""
    encryption_key: str = ""
    # Authentication & Security
    gemini_api_key: Optional[str] = None
    
    # Razorpay (Monetization)
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    razorpay_webhook_secret: Optional[str] = None
    frontend_url: str = "http://localhost:3000"
    environment: str = "development"

    @property
    def youtube_redirect_uri(self) -> str:
        return f"{self.api_url}/api/youtube/callback"

    @property
    def instagram_redirect_uri(self) -> str:
        return f"{self.api_url}/api/instagram/callback"

    @property
    def tiktok_redirect_uri(self) -> str:
        return f"{self.api_url}/api/tiktok/callback"

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
