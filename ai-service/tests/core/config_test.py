import pytest

from core.config import Settings


@pytest.fixture
def env(monkeypatch, tmp_path):
    # Entorno limpio: sin las variables de la máquina ni el .env del proyecto
    for name in ("MODELS_DIR", "MAX_IMAGE_MB"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.chdir(tmp_path)
    return monkeypatch


# Sin variables de entorno el servicio arranca con los valores por defecto
def test_default_values(env):
    assert Settings().model_dump() == {
        "models_dir": "models",
        "max_image_mb": 5 * 1024 * 1024,
    }


def test_attribute_supported_file_types_is_dict():
    assert isinstance(Settings.supported_file_types, dict), (
        "El atributo de clase 'supported_file_types' debe ser un diccionario"
    )


# Se debe leer el .env aunque tenga variables de otras herramientas (p. ej. SONAR_TOKEN)
def test_reads_env_file_with_other_variables(env, tmp_path):
    (tmp_path / ".env").write_text("MAX_IMAGE_MB=8\nSONAR_TOKEN=sqp_123\n")

    assert Settings().max_image_mb == 8
