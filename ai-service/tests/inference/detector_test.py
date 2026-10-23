from pathlib import Path
from types import SimpleNamespace

import numpy as np
import pytest
import torch
from PIL import Image

from inference.detector import draw_box, find_fruit, load_detector

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


# Se debe devolver la caja (x1, y1, x2, y2) de la detección con mayor confianza
def test_finds_most_confident_box():
    detector = FakeDetector(xyxy=[[10, 10, 50, 40], [20, 5, 90, 70]], conf=[0.30, 0.90])

    assert find_fruit(detector, Image.new("RGB", (100, 80))) == (20, 5, 90, 70)


# Si no se detecta ninguna fruta, no hay caja
def test_returns_none_without_detections():
    assert find_fruit(FakeDetector(xyxy=[], conf=[]), Image.new("RGB", (100, 80))) is None


# Con el detector real, en la foto de un banano la caja es más pequeña que la foto (512x512)
def test_finds_fruit_in_real_photo(detector):
    x1, y1, x2, y2 = find_fruit(detector, Image.open(BANANA_PATH))

    assert (x2 - x1) * (y2 - y1) < 512 * 512


# Se debe dibujar solo el contorno verde de la caja, sin rellenarla
def test_draws_green_box_outline():
    image = Image.new("RGB", (100, 80), (128, 128, 128))

    annotated = draw_box(image, (20, 5, 90, 70))

    # borde izquierdo, borde derecho, interior de la caja y fuera de ella
    pixels = [annotated.getpixel(xy) for xy in [(20, 37), (90, 37), (55, 37), (5, 5)]]
    assert pixels == [(0, 255, 0), (0, 255, 0), (128, 128, 128), (128, 128, 128)]


# La foto original no se modifica: el recuadro se dibuja sobre una copia
def test_draw_box_keeps_original_photo():
    image = Image.new("RGB", (100, 80), (128, 128, 128))

    draw_box(image, (20, 5, 90, 70))

    assert image.getpixel((20, 37)) == (128, 128, 128)


# Las fotos con transparencia (RGBA) se devuelven en RGB, porque JPEG no admite canal alfa
def test_draw_box_returns_rgb_for_transparent_photo():
    annotated = draw_box(Image.new("RGBA", (100, 80)), (20, 5, 90, 70))

    assert annotated.mode == "RGB"
