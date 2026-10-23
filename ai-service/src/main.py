from contextlib import asynccontextmanager
from io import BytesIO
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import RedirectResponse
from PIL import Image

from inference.engine import load_model, predict

MODEL_PATH = Path(__file__).resolve().parents[1] / "model" / "tf_model_mobilenetv2.onnx"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the model when the app starts
    app.state.model = load_model(MODEL_PATH)
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


@app.post("/predict")
async def predict_image(image: Annotated[UploadFile, File(...)]) -> dict:
    """Endpoint to predict the class of an image."""

    # Load the model from app state
    session = app.state.model

    # Open the uploaded file as a PIL image
    img = Image.open(BytesIO(await image.read()))

    # Get prediction and confidence
    predicted_class, confidence = predict(session, img)

    return {"class": predicted_class, "confidence": confidence}
