from contextlib import asynccontextmanager
from io import BytesIO
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import RedirectResponse
from PIL import Image

from inference.detector import crop_fruit, load_detector
from inference.engine import load_model, predict

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

    # Load the model from app state
    session = app.state.model

    # Open the uploaded file as a PIL image
    img = Image.open(BytesIO(await image.read()))

    # Crop the fruit first: the classifier was trained on YOLOE crops, not full photos
    fruit = crop_fruit(app.state.detector, img)
    if fruit is None:
        raise HTTPException(422, "No se detectó ninguna fruta en la imagen")

    # Get prediction and confidence
    predicted_class, confidence = predict(session, fruit)

    return {"class": predicted_class, "confidence": confidence}
