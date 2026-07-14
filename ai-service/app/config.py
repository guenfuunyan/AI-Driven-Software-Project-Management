import os
from functools import lru_cache

from pydantic import BaseSettings


class Settings(BaseSettings):
    app_name: str = "AI-Driven Software Project Management"
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./dev.db")
    secret_key: str = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    ai_use_mock: bool = os.getenv("AI_USE_MOCK", "true").lower() == "true"
    cors_origins: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
