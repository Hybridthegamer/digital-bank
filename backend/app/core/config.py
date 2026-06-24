from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://sdps:sdpspass123@postgres:5432/sdps"
    REDIS_URL: str = "redis://redis:6379/0"
    SECRET_KEY: str = "change-me-in-production-must-be-32-ch"
    APP_ENV: str = "development"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_HOURS: int = 24
    ENCRYPTION_KEY: str = "dGhpcyBpcyBhIDMyLWJ5dGUgZW5jcnlwdGlvbg=="
    FRAUD_THRESHOLD_LOW: float = 0.40
    FRAUD_THRESHOLD_HIGH: float = 0.75

    class Config:
        env_file = ".env"


settings = Settings()
