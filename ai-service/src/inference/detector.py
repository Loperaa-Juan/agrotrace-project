from pathlib import Path

from PIL import Image
from ultralytics import YOLOE


def load_detector(path: str | Path) -> YOLOE:
    """Load the YOLOE fruit detector, failing early instead of downloading official weights."""
    # YOLOE silently downloads official weights when given a missing known name, so check first
    if not Path(path).is_file():
        raise FileNotFoundError(f"YOLOE model not found: {path}")
    return YOLOE(str(path))


def crop_fruit(detector: YOLOE, image: Image.Image) -> Image.Image | None:
    """Crop the most confident fruit detection, or return None if no fruit is found."""
    # agnostic_nms: only where the fruit is matters, not which class YOLOE assigns (same as training)
    boxes = detector.predict(image, agnostic_nms=True, verbose=False)[0].boxes
    if len(boxes) == 0:
        return None

    best = boxes.conf.argmax()
    # Crop the PIL image itself: ultralytics' orig_img is BGR
    return image.crop(tuple(boxes.xyxy[best].int().tolist()))
