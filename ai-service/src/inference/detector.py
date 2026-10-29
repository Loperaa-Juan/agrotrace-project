"""Fruit detection with YOLOE: loading the model, locating the fruit and drawing its box."""

from pathlib import Path

from PIL import Image, ImageDraw
from ultralytics import YOLOE

Box = tuple[int, int, int, int]
"""Bounding box as ``(x1, y1, x2, y2)`` pixel coordinates."""


def load_detector(path: str | Path) -> YOLOE:
    """Load the YOLOE fruit detector, failing early instead of downloading official weights.

    Args:
        path: Path to the trained YOLOE weights file.

    Returns:
        The loaded YOLOE model.

    Raises:
        FileNotFoundError: If the weights file does not exist.
    """
    # YOLOE silently downloads official weights when given a missing known name, so check first
    if not Path(path).is_file():
        raise FileNotFoundError(f"YOLOE model not found: {path}")
    return YOLOE(str(path))


def find_fruit(detector: YOLOE, image: Image.Image) -> Box | None:
    """Locate the most confident fruit detection in an image.

    Args:
        detector: Loaded YOLOE model.
        image: Photo to search.

    Returns:
        The box of the detection with the highest confidence, or None if nothing was detected.
    """
    # agnostic_nms: only where the fruit is matters, not which class YOLOE assigns (same as training)
    boxes = detector.predict(image, agnostic_nms=True, verbose=False)[0].boxes
    if len(boxes) == 0:
        return None

    best = boxes.conf.argmax()
    return tuple(boxes.xyxy[best].int().tolist())


def draw_box(image: Image.Image, box: Box) -> Image.Image:
    """Outline a box in green on a copy of the image, without a label.

    Args:
        image: Photo to annotate. It is not modified.
        box: Box to draw.

    Returns:
        An RGB copy of the image with the box drawn on it.
    """
    annotated = image.convert("RGB")
    ImageDraw.Draw(annotated).rectangle(box, outline=(0, 255, 0), width=3)
    return annotated
