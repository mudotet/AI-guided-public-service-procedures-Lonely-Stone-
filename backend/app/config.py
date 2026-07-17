from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Birth Registration Guide API"
    app_env: str = "development"
    database_url: str = "postgresql+psycopg://birthguide:birthguide@localhost:5432/birthguide"
    openai_api_key: str | None = None
    openai_classifier_model: str = "gpt-4.1-mini"
    openai_assistant_model: str = "gpt-4.1"
    openai_transcription_model: str = "gpt-4o-transcribe"
    admin_api_key: str | None = None
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    model_config = SettingsConfigDict(env_file=(".env", ".env.local"), extra="ignore")

    @field_validator("database_url", mode="before")
    @classmethod
    def use_psycopg3(cls, value: str) -> str:
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
