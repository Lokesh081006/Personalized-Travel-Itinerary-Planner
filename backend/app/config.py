from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Roamly API"
    openai_base_url: str = ""
    openai_api_key: str = ""
    openai_model: str = "Qwen/Qwen3-8B"
    supabase_url: str = ""
    supabase_secret_key: str = ""
    supabase_service_role_key: str = ""
    cors_origins: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def llm_configured(self) -> bool:
        return bool(self.openai_base_url)

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_key)

    @property
    def supabase_key(self) -> str:
        """Prefer the current secret key, with legacy service_role fallback."""
        return self.supabase_secret_key or self.supabase_service_role_key


@lru_cache
def get_settings() -> Settings:
    return Settings()
