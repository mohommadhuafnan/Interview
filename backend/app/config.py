from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Interview Integrity Platform"
    secret_key: str = "change-me-in-production-use-strong-secret-key"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    supabase_url: str = ""
    supabase_key: str = ""
    supabase_service_key: str = ""
    database_url: str = ""

    cors_origins: list[str] = ["http://localhost:3000"]

    upload_dir: str = "uploads"
    reports_dir: str = "reports"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
