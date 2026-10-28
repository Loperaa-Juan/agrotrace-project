import uuid
from contextlib import asynccontextmanager
from io import BytesIO
from pathlib import Path
from typing import Annotated

import magic
from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import RedirectResponse
from PIL import Image

from core.config import settings
from inference.detector import load_detector
from inference.engine import load_model
from inference.pipeline import analyze_fruit
from storage.s3 import build_key, create_s3_client, upload_image

MODEL_DIR = Path(__file__).resolve().parents[1] / "model"
MODEL_PATH = MODEL_DIR / "tf_model_mobilenetv2.onnx"
DETECTOR_PATH = MODEL_DIR / "yoloe-26s-seg-fruits.pt"

ORIGINAL_FOLDER = "original"
ANNOTATED_FOLDER = "annotated"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the models and create the S3 client when the app starts
    app.state.model = load_model(MODEL_PATH)
    app.state.detector = load_detector(DETECTOR_PATH)
    app.state.s3 = create_s3_client()
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

    annotated_jpeg = to_jpeg_bytes(result.annotated_image)
    uuid_key = uuid.uuid4()

    # Store both photos, each one in its own folder (boto3 is blocking, so run it in a thread)
    original_key = await run_in_threadpool(
        upload_image,
        app.state.s3,
        content,
        build_key(ORIGINAL_FOLDER, uuid_key, settings.supported_file_types[file_type]),
        file_type,
    )
    annotated_key = await run_in_threadpool(
        upload_image,
        app.state.s3,
        annotated_jpeg,
        build_key(ANNOTATED_FOLDER, uuid_key, "jpeg"),
        "image/jpeg",
    )

    return {
        "class": result.predicted_class,
        "confidence": result.trust_score,
        "original_key": original_key,
        "annotated_key": annotated_key,
    }


def to_jpeg_bytes(image: Image.Image) -> bytes:
    """Encode an image as JPEG."""
    buffer = BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()
