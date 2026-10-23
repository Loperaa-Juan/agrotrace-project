from io import BytesIO

from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

from main import app

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


# El endpoint /predict debe recibir la imagen como archivo y devolver su clase
def test_predict_classifies_uploaded_image():
    buffer = BytesIO()
    Image.new("RGB", (64, 64), "red").save(buffer, format="PNG")

    # El bloque with ejecuta el lifespan, que carga el modelo
    with TestClient(app) as app_client:
        response = app_client.post(
            "/predict", files={"image": ("fruta.png", buffer.getvalue(), "image/png")}
        )

    assert response.json()["class"] in ("Fresh", "Mild", "Rotten")
