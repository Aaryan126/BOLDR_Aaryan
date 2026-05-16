from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "BOLDR Revenue Rocket"
    app_version: str = "0.1.0"
    app_phase: str = "phase-9-kb-loop"
    app_env: str = "development"
    cors_origins_raw: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        validation_alias="CORS_ORIGINS",
    )
    ai_provider: str = Field(default="fpt_ai_factory", validation_alias="AI_PROVIDER")
    fpt_ai_api_key: str = Field(default="", validation_alias="FPT_AI_API_KEY")
    fpt_ai_base_url: str = Field(
        default="https://mkp-api.fptcloud.com/v1",
        validation_alias="FPT_AI_BASE_URL",
    )
    glm_model: str = Field(default="GLM-5.1", validation_alias="GLM_MODEL")
    ai_timeout_seconds: float = Field(default=30.0, validation_alias="AI_TIMEOUT_SECONDS")
    ai_max_retries: int = Field(default=2, validation_alias="AI_MAX_RETRIES")
    ai_live_enabled: bool = Field(default=False, validation_alias="AI_LIVE_ENABLED")

    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
