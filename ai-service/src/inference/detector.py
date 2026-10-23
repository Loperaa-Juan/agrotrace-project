from pathlib import Path

from PIL import Image, ImageDraw
from ultralytics import YOLOE

Box = tuple[int, int, int, int]


def load_detector(path: str | Path) -> YOLOE:
    """Load the YOLOE fruit detector, failing early instead of downloading official weights."""
    # YOLOE silently downloads official weights when given a missing known name, so check first
    if not Path(path).is_file():
        raise FileNotFoundError(f"YOLOE model not found: {path}")
    return YOLOE(str(path))


def find_fruit(detector: YOLOE, image: Image.Image) -> Box | None:
    """Return the (x1, y1, x2, y2) box of the most confident fruit detection, or None."""
    # agnostic_nms: only where the fruit is matters, not which class YOLOE assigns (same as training)
    boxes = detector.predict(image, agnostic_nms=True, verbose=False)[0].boxes
    if len(boxes) == 0:
        return None

    best = boxes.conf.argmax()
    return tuple(boxes.xyxy[best].int().tolist())


def draw_box(image: Image.Image, box: Box) -> Image.Image:
    """Return an RGB copy of the image with the box outlined in green, without a label."""
    annotated = image.convert("RGB")
    ImageDraw.Draw(annotated).rectangle(box, outline=(0, 255, 0), width=3)
    return annotated
