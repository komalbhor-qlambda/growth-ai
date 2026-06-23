"""app/core/config.py — Pydantic settings loaded from .env"""
from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # App
    APP_NAME: str = "SME Growth AI"
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    ALLOWED_HOSTS: str = "yourdomain.com,*.yourdomain.com"

    @property
    def origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    @property
    def allowed_hosts_list(self) -> List[str]:
        return [h.strip() for h in self.ALLOWED_HOSTS.split(",")]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/sme_growth_ai"
    DATABASE_URL_SYNC: str = "postgresql://postgres:postgres@localhost:5432/sme_growth_ai"

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Qdrant
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_API_KEY: str | None = None
    QDRANT_COLLECTION: str = "knowledge_chunks"

    # AI
    ANTHROPIC_API_KEY: str = "sk-ant-replace-me"
    OPENAI_API_KEY: str = "sk-replace-me"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536
    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"
    AI_CONFIDENCE_THRESHOLD: float = 0.70
    MAX_CONTEXT_CHUNKS: int = 5
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 64

    # Razorpay
    RAZORPAY_KEY_ID: str = "rzp_test_replace_me"
    RAZORPAY_KEY_SECRET: str = "replace_me"
    RAZORPAY_WEBHOOK_SECRET: str = "replace_me"

    # WhatsApp
    WHATSAPP_TOKEN: str = "replace_me"
    WHATSAPP_PHONE_NUMBER_ID: str = "replace_me"
    WHATSAPP_VERIFY_TOKEN: str = "replace_me"
    WHATSAPP_API_URL: str = "https://graph.facebook.com/v19.0"

    # AWS S3
    AWS_ACCESS_KEY_ID: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None
    AWS_REGION: str = "ap-south-1"
    S3_BUCKET_NAME: str = "sme-growth-ai-docs"

    # Sentry
    SENTRY_DSN: str | None = None

    # Multi-tenancy
    MAX_TENANTS: int = 100
    DEFAULT_PLAN: str = "starter"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
