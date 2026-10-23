from fastapi import FastAPI
from fastapi.testclient import TestClient

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
