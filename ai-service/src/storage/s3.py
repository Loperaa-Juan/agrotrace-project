import uuid

import boto3

from core.config import settings


def create_s3_client():
    """Create the S3 client with the credentials from the settings."""
    return boto3.client(
        "s3",
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region,
    )


def build_key(folder: str, extension: str) -> str:
    """Build a unique object key: <folder>/<uuid4>.<extension>."""
    return f"{folder}/{uuid.uuid4()}.{extension}"


def upload_image(client, content: bytes, key: str, content_type: str) -> str:
    """Store the image in the bucket and return its key."""
    client.put_object(
        Bucket=settings.s3_bucket_name,
        Key=key,
        Body=content,
        ContentType=content_type,
    )
    return key


def get_presigned_url(client, key: str, expires_in: int = 3600) -> str:
    """Temporary URL to read a private object."""
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket_name, "Key": key},
        ExpiresIn=expires_in,
    )
