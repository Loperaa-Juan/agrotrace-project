from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image

CLASS_NAMES = ("Fresh", "Mild", "Rotten")


def load_model(path: str | Path) -> ort.InferenceSession:
    """Load the ONNX classifier, failing early if the file is missing."""
    if not Path(path).is_file():
        raise FileNotFoundError(f"ONNX model not found: {path}")
    return ort.InferenceSession(str(path))


def predict(session: ort.InferenceSession, image: Image.Image) -> tuple[str, float]:
    """Classify a cropped fruit image as Fresh, Mild or Rotten with its confidence."""
    # The model resizes and normalizes internally, so pixels go in as raw 0-255 values
    img = np.expand_dims(np.asarray(image.convert("RGB"), dtype=np.float32), axis=0)
    input_name = session.get_inputs()[0].name

    preds = session.run(None, {input_name: img})[0]

    return CLASS_NAMES[int(np.argmax(preds))], float(np.max(preds))
