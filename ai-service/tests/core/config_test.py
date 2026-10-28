import pytest

from core.config import Settings


@pytest.fixture
def env(monkeypatch, tmp_path):
    # Entorno limpio: sin las variables de la máquina ni el .env del proyecto
    for name in (
        "MODELS_DIR",
        "MAX_IMAGE_MB",
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_REGION",
        "S3_BUCKET_NAME",
    ):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.chdir(tmp_path)
    return monkeypatch


# Sin variables de entorno el servicio arranca con los valores por defecto
def test_default_values(env):
    assert Settings().model_dump() == {
        "models_dir": "models",
        "max_image_mb": 5 * 1024 * 1024,
        "aws_access_key_id": "",
        "aws_secret_access_key": "",
        "aws_region": "us-east-1",
        "s3_bucket_name": "",
    }


def test_attribute_supported_file_types_is_dict():
    assert isinstance(Settings.supported_file_types, dict), (
        "El atributo de clase 'supported_file_types' debe ser un diccionario"
    )


# Se debe leer el .env aunque tenga variables de otras herramientas (p. ej. SONAR_TOKEN)
def test_reads_env_file_with_other_variables(env, tmp_path):
    (tmp_path / ".env").write_text("MAX_IMAGE_MB=8\nSONAR_TOKEN=sqp_123\n")

    assert Settings().max_image_mb == 8


# Las credenciales y el bucket de S3 se deben leer del .env (pydantic no los exporta a os.environ, así que boto3 no los vería solo)
def test_reads_s3_settings_from_env_file(env, tmp_path):
    (tmp_path / ".env").write_text(
        "AWS_ACCESS_KEY_ID=AKIA_TEST\n"
        "AWS_SECRET_ACCESS_KEY=secret_test\n"
        "AWS_REGION=us-east-2\n"
        "S3_BUCKET_NAME=test-agrotrace\n"
    )

    s3_settings = Settings()

    assert (
        s3_settings.aws_access_key_id,
        s3_settings.aws_secret_access_key,
        s3_settings.aws_region,
        s3_settings.s3_bucket_name,
    ) == ("AKIA_TEST", "secret_test", "us-east-2", "test-agrotrace")
