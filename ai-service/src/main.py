import base64
from contextlib import asynccontextmanager
from io import BytesIO
from pathlib import Path
from typing import Annotated

import magic
from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.responses import RedirectResponse
from PIL import Image

from core.config import settings
from inference.detector import load_detector
from inference.engine import load_model
from inference.pipeline import analyze_fruit

MODEL_DIR = Path(__file__).resolve().parents[1] / "model"
MODEL_PATH = MODEL_DIR / "tf_model_mobilenetv2.onnx"
DETECTOR_PATH = MODEL_DIR / "yoloe-26s-seg-fruits.pt"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the models when the app starts
    app.state.model = load_model(MODEL_PATH)
    app.state.detector = load_detector(DETECTOR_PATH)
    yield
    # Unload the model when the app stops (if applicable)
    # del app.state.model


app = FastAPI(
    title="AI Service",
    description="Microservicio de clasificación de imágenes",
    version="1.0",
    lifespan=lifespan,
)


@app.get("/", include_in_schema=False)
async def root():
    """Redirect to the automatic documentation."""
    return RedirectResponse(url="/docs")


@app.post(
    "/predict",
    responses={422: {"description": "No se detectó ninguna fruta en la imagen"}},
)
async def predict_image(image: Annotated[UploadFile, File(...)]) -> dict:
    """Endpoint to predict the class of an image."""

    # Validate that the request contains the image
    content = await image.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No se encontró el archivo"
        )

    # Validate the image's size is between 0 and 6 MB
    file_size = len(content)
    if not 0 < file_size <= settings.max_image_mb:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La imagen excede el tamaño máximo permitido",
        )

    # Validate the file type
    file_type = magic.from_buffer(buffer=content, mime=True)

    if file_type not in settings.supported_file_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de archivo no soportado. Tipos de archivo soportados: {settings.supported_file_types}",
        )

    # Open the uploaded file as a PIL image
    img = Image.open(BytesIO(content))

    # Detect the fruit once, then classify its crop and mark it on the photo
    result = analyze_fruit(app.state.detector, app.state.model, img)
    if result is None:
        raise HTTPException(422, "No se detectó ninguna fruta en la imagen")

    return {
        "class": result.predicted_class,
        "confidence": result.trust_score,
        "annotated_image": encode_jpeg(result.annotated_image),
    }


def encode_jpeg(image: Image.Image) -> str:
    """Encode an image as base64 JPEG so it fits in the JSON response."""
    buffer = BytesIO()
    image.save(buffer, format="JPEG")
    return base64.b64encode(buffer.getvalue()).decode()
