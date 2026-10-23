from pathlib import Path
from types import SimpleNamespace

import numpy as np
import pytest
import torch
from PIL import Image

from inference.detector import crop_fruit, load_detector

DETECTOR_PATH = (
    Path(__file__).resolve().parents[2] / "model" / "yoloe-26s-seg-fruits.pt"
)
BANANA_PATH = Path(__file__).resolve().parents[1] / "fixtures" / "banana.jpeg"


class FakeBoxes:
    # Imita las Boxes de ultralytics: coordenadas xyxy, confianza y clase de cada detección
    def __init__(self, xyxy, conf):
        self.xyxy = torch.tensor(xyxy, dtype=torch.float32).reshape(-1, 4)
        self.conf = torch.tensor(conf, dtype=torch.float32)
        self.cls = torch.zeros_like(self.conf)

    def __len__(self):
        return len(self.conf)


class FakeDetector:
    # Imita un YOLOE de ultralytics: predict devuelve un resultado con sus cajas y la imagen en BGR
    def __init__(self, xyxy, conf):
        self.boxes = FakeBoxes(xyxy, conf)

    def predict(self, source, **kwargs):
        orig_img = np.asarray(source.convert("RGB"))[:, :, ::-1]
        return [SimpleNamespace(boxes=self.boxes, orig_img=orig_img)]


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


# Se debe recortar la caja con mayor confianza, conservando los colores RGB de la foto
def test_crops_most_confident_box_in_rgb():
    image = Image.new("RGB", (100, 80))
    image.paste((255, 0, 0), (20, 5, 90, 70))  # la fruta: solo esta zona es roja
    detector = FakeDetector(xyxy=[[10, 10, 50, 40], [20, 5, 90, 70]], conf=[0.30, 0.90])

    crop = crop_fruit(detector, image)

    assert crop.getcolors() == [(70 * 65, (255, 0, 0))]


# Si no se detecta ninguna fruta, no hay recorte
def test_returns_none_without_detections():
    assert crop_fruit(FakeDetector(xyxy=[], conf=[]), Image.new("RGB", (100, 80))) is None


# Con el detector real, en la foto de un banano el recorte es más pequeño que la foto
def test_crops_fruit_from_real_photo(detector):
    photo = Image.open(BANANA_PATH)

    crop = crop_fruit(detector, photo)

    assert crop.width * crop.height < photo.width * photo.height
