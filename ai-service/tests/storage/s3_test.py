import uuid
from unittest.mock import Mock, patch

import pytest

from core.config import settings
from storage.s3 import build_key, create_s3_client, get_presigned_url, upload_image


@pytest.fixture
def bucket(monkeypatch):
    monkeypatch.setattr(settings, "s3_bucket_name", "test-agrotrace")
    return "test-agrotrace"


# El cliente de S3 se debe crear con las credenciales y la región de la configuración
@patch("storage.s3.boto3.client")
def test_create_s3_client_uses_settings(mock_boto_client, monkeypatch):
    monkeypatch.setattr(settings, "aws_access_key_id", "AKIA_TEST")
    monkeypatch.setattr(settings, "aws_secret_access_key", "secret_test")
    monkeypatch.setattr(settings, "aws_region", "us-east-2")

    client = create_s3_client()

    mock_boto_client.assert_called_once_with(
        "s3",
        aws_access_key_id="AKIA_TEST",
        aws_secret_access_key="secret_test",
        region_name="us-east-2",
    )
    assert client == mock_boto_client.return_value


# La imagen se debe guardar en el bucket configurado, con su content type
def test_upload_image_puts_object_in_bucket(bucket):
    client = Mock()

    upload_image(client, b"bytes", "images/fruta.jpeg", "image/jpeg")

    client.put_object.assert_called_once_with(
        Bucket=bucket,
        Key="images/fruta.jpeg",
        Body=b"bytes",
        ContentType="image/jpeg",
    )


# Al subir la imagen se debe devolver la key, que es lo que se guarda en la base de datos
def test_upload_image_returns_key(bucket):
    key = upload_image(Mock(), b"bytes", "images/fruta.jpeg", "image/jpeg")

    assert key == "images/fruta.jpeg"


# El bucket es privado: se entrega una URL prefirmada que expira
def test_get_presigned_url_expires(bucket):
    client = Mock()
    client.generate_presigned_url.return_value = "https://signed-url"

    url = get_presigned_url(client, "images/fruta.jpeg", expires_in=600)

    client.generate_presigned_url.assert_called_once_with(
        "get_object",
        Params={"Bucket": bucket, "Key": "images/fruta.jpeg"},
        ExpiresIn=600,
    )
    assert url == "https://signed-url"


# El nombre del archivo es un uuid v4 dentro de la carpeta indicada, con su extensión
def test_build_key_uses_uuid4_in_folder():
    folder, filename = build_key("original", "jpeg").split("/")

    name, extension = filename.rsplit(".", 1)
    assert (folder, extension) == ("original", "jpeg")
    assert str(uuid.UUID(name, version=4)) == name


# Dos imágenes nunca deben quedar con la misma key
def test_build_key_is_unique():
    keys = {build_key("original", "jpeg") for _ in range(2)}

    assert len(keys) == 2
