from typing import ClassVar

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # .env may hold variables for other tools (e.g. SONAR_TOKEN), so ignore unknown keys
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    models_dir: str = "models"

    max_image_mb: int = 5 * 1024 * 1024

    supported_file_types: ClassVar[dict[str, str]] = {
        "image/png": "png",
        "image/jpg": "jpg",
        "image/jpeg": "jpeg",
        "image/webp": "webp",
    }


settings = Settings()
