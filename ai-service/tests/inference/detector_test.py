from pathlib import Path

import pytest
from inference.detector import load_detector
from PIL import Image

DETECTOR_PATH = (
    Path(__file__).resolve().parents[2] / "model" / "yoloe-26s-seg-fruits.pt"
)


@pytest.fixture(scope="module")
def detector():
    # Se carga una sola vez para todos los tests del archivo (torch tarda en arrancar)
    return load_detector(DETECTOR_PATH)


# El detector debe venir con las frutas del entrenamiento, sin tener que llamar a set_classes
def test_loads_detector_with_training_fruits(detector):
    assert list(detector.names.values()) == [
        "avocado",
        "banana",
        "cucumber",
        "Papaya",
        "tomato",
    ]


# El detector cargado debe poder procesar una imagen de PIL
def test_loads_detector_ready_to_detect(detector):
    results = detector.predict(Image.new("RGB", (320, 240)), verbose=False)

    assert results[0].orig_img.shape == (240, 320, 3)


# Si el archivo no existe, se debe lanzar FileNotFoundError en lugar de descargar los pesos oficiales
def test_missing_detector_raises_file_not_found(tmp_path):
    with pytest.raises(FileNotFoundError):
        load_detector(tmp_path / "yoloe-26s-seg.pt")
