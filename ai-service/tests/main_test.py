import base64
from io import BytesIO
from pathlib import Path

import numpy as np
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image
from unittest.mock import patch
from main import app

BANANA_PATH = Path(__file__).resolve().parent / "fixtures" / "banana.jpeg"

client = TestClient(app)


# Se debe crear una instancia de FastAPI correctamente
def test_app_creation():
    assert isinstance(app, FastAPI)


# Se debe mostrar la metadata del proyecto en la documentación de la API
def test_app_metadata():
    assert app.title == "AI Service"
    assert app.description == "Microservicio de clasificación de imágenes"
    assert app.version == "1.0"


# Al visitar el root de la aplicación, se debe redirigir a la documentación de la API (/docs)
def test_redirect_docs():
    response = client.get("/", follow_redirects=False)
    assert response.status_code == 307
    assert (
        response.headers["location"] == "/docs"
    )  # Verifica que la URL redirige a /docs


def post_image(content, filename="fruta.jpeg", content_type="image/jpeg"):
    # El bloque with ejecuta el lifespan, que carga los modelos
    with TestClient(app) as app_client:
        return app_client.post(
            "/predict", files={"image": (filename, content, content_type)}
        )


# El endpoint debe arrojar un error 400 si la request no contiene una imagen
def test_predict_fails_without_image():
    contenido_vacio = b""

    # Ejecutamos tu función helper
    respuesta = post_image(content=contenido_vacio, filename="vacio.jpeg")

    # Validamos que el endpoint responda con el código de error configurado (ej. 400)
    assert respuesta.status_code == 400


# El endpoint debe validar que el archivo esté entre 0 y 5 MB
def test_predict_fails_with_6MB_file():
    contenido = b"0" * (6 * 1024 * 1024)

    respuesta = post_image(content=contenido)

    assert respuesta.status_code == 400
    assert "La imagen excede el tamaño máximo permitido" in respuesta.json()["detail"]

# El endpoint debe rechazar tipos de archivos que no estén en supported_file_types
@patch("main.magic.from_buffer")
def test_reject_other_file_type(mock_magic):
    # Simulamos que magic detecta que es un PDF legítimo
    mock_magic.return_value = "application/pdf"

    respuesta = post_image(content=b"%PDF-1.4 contenido")

    assert respuesta.status_code == 400
    assert "Tipo de archivo no soportado" in respuesta.json()["detail"]

# El endpoint /predict debe recibir la foto como archivo y devolver la clase de la fruta
def test_predict_classifies_fruit_photo():
    response = post_image(BANANA_PATH.read_bytes())

    assert response.json()["class"] in ("Fresh", "Mild", "Rotten")


# El clasificador debe recibir el recorte de la fruta, no la foto completa (512x512)
def test_predict_classifies_cropped_fruit(monkeypatch):
    received_sizes = []

    def spy_predict(session, image):
        received_sizes.append(image.size)
        return "Fresh", 0.9

    monkeypatch.setattr("inference.pipeline.predict", spy_predict)

    post_image(BANANA_PATH.read_bytes())

    assert received_sizes[0] != (512, 512)

# YOLO debe correr una sola vez por foto: la misma detección sirve para recortar y para dibujar
def test_predict_runs_detector_once(monkeypatch):
    calls = []

    with TestClient(app) as app_client:
        original_predict = app.state.detector.predict

        def counting_predict(*args, **kwargs):
            calls.append(1)
            return original_predict(*args, **kwargs)

        monkeypatch.setattr(app.state.detector, "predict", counting_predict)
        app_client.post(
            "/predict",
            files={"image": ("fruta.jpeg", BANANA_PATH.read_bytes(), "image/jpeg")},
        )

    assert len(calls) == 1


# Si no se detecta ninguna fruta, se debe responder 422 con un mensaje claro
def test_predict_without_fruit_returns_422():
    buffer = BytesIO()
    Image.new("RGB", (64, 64), "red").save(buffer, format="PNG")

    response = post_image(buffer.getvalue(), "rojo.png", "image/png")

    assert (response.status_code, response.json()) == (
        422,
        {"detail": "No se detectó ninguna fruta en la imagen"},
    )


def decode_image(encoded):
    return Image.open(BytesIO(base64.b64decode(encoded)))


def count_green_pixels(image):
    # Píxeles casi verde puro (0, 255, 0): el color del recuadro que marca la fruta
    pixels = np.asarray(image.convert("RGB")).astype(int)
    return int(
        ((pixels[..., 1] > 200) & (pixels[..., 0] < 80) & (pixels[..., 2] < 80)).sum()
    )


# La respuesta debe incluir la foto completa (no el recorte) como JPEG en base64
def test_predict_returns_annotated_photo():
    response = post_image(BANANA_PATH.read_bytes())

    annotated = decode_image(response.json()["annotated_image"])

    assert (annotated.format, annotated.size) == ("JPEG", (512, 512))


# La foto devuelta debe tener dibujado el recuadro verde alrededor de la fruta.
# La foto original no tiene píxeles verde puro; un recuadro de 3 px alrededor del banano deja unos 4000
def test_predict_draws_bounding_box_on_photo():
    response = post_image(BANANA_PATH.read_bytes())

    annotated = decode_image(response.json()["annotated_image"])

    assert count_green_pixels(annotated) > 2000
