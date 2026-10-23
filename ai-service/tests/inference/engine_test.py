from pathlib import Path
from types import SimpleNamespace

import numpy as np
import pytest
from PIL import Image

from inference.engine import load_model, predict

MODEL_PATH = Path(__file__).resolve().parents[2] / "model" / "tf_model_mobilenetv2.onnx"


class FakeSession:
    # Imita una InferenceSession de onnxruntime: devuelve probabilidades fijas y guarda lo que recibe
    def __init__(self, probabilities):
        self.probabilities = probabilities
        self.feed = None

    def get_inputs(self):
        return [SimpleNamespace(name="input")]

    def run(self, output_names, input_feed):
        self.feed = input_feed
        return [np.array([self.probabilities], dtype=np.float32)]


# Se debe cargar el modelo ONNX listo para predecir: una imagen da 3 probabilidades
def test_loads_model_ready_for_inference():
    session = load_model(MODEL_PATH)
    image = np.zeros((1, 224, 224, 3), dtype=np.float32)

    outputs = session.run(None, {session.get_inputs()[0].name: image})

    assert outputs[0].shape == (1, 3)


# Si el archivo del modelo no existe, se debe lanzar FileNotFoundError
def test_missing_model_raises_file_not_found(tmp_path):
    with pytest.raises(FileNotFoundError):
        load_model(tmp_path / "no-existe.onnx")


# Se debe predecir la clase con mayor probabilidad (orden del modelo: Fresh, Mild, Rotten)
@pytest.mark.parametrize(
    ("probabilities", "expected_class"),
    [
        ([0.80, 0.15, 0.05], "Fresh"),
        ([0.10, 0.70, 0.20], "Mild"),
        ([0.10, 0.25, 0.65], "Rotten"),
    ],
)
def test_predicts_class_with_highest_probability(probabilities, expected_class):
    predicted_class, _ = predict(FakeSession(probabilities), Image.new("RGB", (8, 8)))

    assert predicted_class == expected_class


# La confianza debe ser la probabilidad de la clase predicha, entre 0 y 1 (no en porcentaje)
def test_trust_score_is_highest_probability():
    _, trust_score = predict(FakeSession([0.10, 0.25, 0.65]), Image.new("RGB", (8, 8)))

    assert trust_score == pytest.approx(0.65)


# La imagen se envía como un lote float32 de forma (1, alto, ancho, 3)
def test_sends_image_as_float32_batch():
    session = FakeSession([0.80, 0.15, 0.05])

    predict(session, Image.new("RGB", (40, 30)))

    sent = session.feed["input"]
    assert (sent.shape, sent.dtype) == ((1, 30, 40, 3), np.float32)


# Los píxeles se envían en 0-255 sin normalizar: el modelo ya aplica el preprocess_input de MobileNetV2
def test_sends_pixels_without_normalizing():
    session = FakeSession([0.80, 0.15, 0.05])

    predict(session, Image.new("RGB", (8, 8), (255, 128, 0)))

    assert session.feed["input"][0, 0, 0].tolist() == [255.0, 128.0, 0.0]


# Las imágenes que no son RGB (PNG con transparencia, escala de grises) se deben convertir a RGB
@pytest.mark.parametrize("mode", ["RGBA", "L"])
def test_converts_non_rgb_images(mode):
    session = FakeSession([0.80, 0.15, 0.05])

    predict(session, Image.new(mode, (8, 8)))

    assert session.feed["input"].shape == (1, 8, 8, 3)


# Con el modelo real, una imagen da una de las tres clases
def test_predicts_with_real_model():
    predicted_class, _ = predict(
        load_model(MODEL_PATH), Image.new("RGB", (64, 64), "red")
    )

    assert predicted_class in ("Fresh", "Mild", "Rotten")
