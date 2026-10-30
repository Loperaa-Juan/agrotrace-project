"""Image storage in AWS S3."""

import uuid

import boto3

from core.config import settings


def create_s3_client():
    """Create the S3 client with the credentials from the settings.

    Returns:
        A boto3 S3 client.
    """
    return boto3.client(
        "s3",
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region,
    )


def build_key(folder: str, uuid: uuid.UUID, extension: str) -> str:
    """Build an object key with the format ``<folder>/<uuid>.<extension>``.

    Args:
        folder: Folder (key prefix) where the object is stored.
        uuid: Unique identifier of the object.
        extension: File extension, without the dot.

    Returns:
        The object key.
    """
    return f"{folder}/{uuid}.{extension}"


def upload_image(client, content: bytes, key: str, content_type: str) -> str:
    """Store an image in the configured bucket.

    Args:
        client: boto3 S3 client.
        content: Raw bytes of the image.
        key: Object key under which the image is stored.
        content_type: MIME type of the image.

    Returns:
        The key of the stored object.
    """
    client.put_object(
        Bucket=settings.s3_bucket_name,
        Key=key,
        Body=content,
        ContentType=content_type,
    )
    return key


def build_public_url(key: str) -> str:
    """Build the public URL of a stored object.

    Uses ``assets_base_url`` when set (e.g. a CloudFront domain); otherwise the bucket's S3 URL.

    Args:
        key: Key of the object.

    Returns:
        The public URL of the object.
    """
    base = (
        settings.assets_base_url
        or f"https://{settings.s3_bucket_name}.s3.{settings.aws_region}.amazonaws.com"
    )
    return f"{base.rstrip('/')}/{key}"


def get_presigned_url(client, key: str, expires_in: int = 3600) -> str:
    """Generate a temporary URL to read a private object.

    Args:
        client: boto3 S3 client.
        key: Key of the object to read.
        expires_in: Validity of the URL, in seconds.

    Returns:
        The presigned URL.
    """
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket_name, "Key": key},
        ExpiresIn=expires_in,
    )
