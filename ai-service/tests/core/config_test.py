import pytest

from core.config import Settings


@pytest.fixture
def env(monkeypatch, tmp_path):
    # Entorno limpio: sin las variables de la máquina ni el .env del proyecto
    for name in ("MODELS_DIR", "MAX_IMAGE_MB"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.chdir(tmp_path)
    return monkeypatch


# Se deben leer las variables de entorno, con MAX_IMAGE_MB convertido a número
def test_reads_environment_variables(env):
    env.setenv("MODELS_DIR", "/modelos")
    env.setenv("MAX_IMAGE_MB", "10")

    assert Settings().model_dump() == {"models_dir": "/modelos", "max_image_mb": 10}


# Sin variables de entorno el servicio arranca con los valores por defecto
def test_default_values(env):
    assert Settings().model_dump() == {"models_dir": "models", "max_image_mb": 5}


# Se debe leer el .env aunque tenga variables de otras herramientas (p. ej. SONAR_TOKEN)
def test_reads_env_file_with_other_variables(env, tmp_path):
    (tmp_path / ".env").write_text("MAX_IMAGE_MB=8\nSONAR_TOKEN=sqp_123\n")

    assert Settings().max_image_mb == 8
