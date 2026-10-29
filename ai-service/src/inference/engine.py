"""Fruit quality classification with the ONNX model."""

from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image

CLASS_NAMES = ("Fresh", "Mild", "Rotten")
"""Class labels, in the same order as the model outputs."""


def load_model(path: str | Path) -> ort.InferenceSession:
    """Load the ONNX classifier, failing early if the file is missing.

    Args:
        path: Path to the ONNX model file.

    Returns:
        The ONNX Runtime inference session.

    Raises:
        FileNotFoundError: If the model file does not exist.
    """
    if not Path(path).is_file():
        raise FileNotFoundError(f"ONNX model not found: {path}")
    return ort.InferenceSession(str(path))


def predict(session: ort.InferenceSession, image: Image.Image) -> tuple[str, float]:
    """Classify a cropped fruit image.

    Args:
        session: ONNX Runtime session of the classifier.
        image: Cropped fruit image.

    Returns:
        The predicted class (``Fresh``, ``Mild`` or ``Rotten``) and its confidence, between 0 and 1.
    """
    # The model resizes and normalizes internally, so pixels go in as raw 0-255 values
    img = np.expand_dims(np.asarray(image.convert("RGB"), dtype=np.float32), axis=0)
    input_name = session.get_inputs()[0].name

    preds = session.run(None, {input_name: img})[0]

    return CLASS_NAMES[int(np.argmax(preds))], float(np.max(preds))
