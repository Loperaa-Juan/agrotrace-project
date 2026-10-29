"""Application settings loaded from environment variables and the .env file."""

from typing import ClassVar

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Service configuration, read from environment variables or the .env file.

    Attributes:
        models_dir: Models directory.
        max_image_mb: Maximum accepted image size, expressed in bytes.
        aws_access_key_id: AWS access key used by the S3 client.
        aws_secret_access_key: AWS secret key used by the S3 client.
        aws_region: AWS region of the bucket.
        s3_bucket_name: Name of the bucket where the images are stored.
        supported_file_types: Accepted MIME types mapped to their file extension.
    """

    # .env may hold variables for other tools (e.g. SONAR_TOKEN), so ignore unknown keys
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    models_dir: str = "models"

    max_image_mb: int = 5 * 1024 * 1024

    # pydantic reads the .env into Settings only (not os.environ), so boto3 gets these explicitly
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    s3_bucket_name: str = ""

    supported_file_types: ClassVar[dict[str, str]] = {
        "image/png": "png",
        "image/jpg": "jpg",
        "image/jpeg": "jpeg",
        "image/webp": "webp",
    }


settings = Settings()
