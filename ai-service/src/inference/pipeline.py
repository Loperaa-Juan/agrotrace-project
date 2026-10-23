import onnxruntime as ort
from PIL import Image
from ultralytics import YOLOE

from inference.detector import draw_box, find_fruit
from inference.engine import predict
from models import DetectionResult


def analyze_fruit(
    detector: YOLOE, session: ort.InferenceSession, image: Image.Image
) -> DetectionResult | None:
    """Detect the fruit once, classify its crop and mark it on the photo; None if no fruit."""
    box = find_fruit(detector, image)
    if box is None:
        return None

    # The classifier was trained on YOLOE crops, not full photos
    cropped = image.crop(box)
    predicted_class, trust_score = predict(session, cropped)

    return DetectionResult(
        annotated_image=draw_box(image, box),
        cropped_image=cropped,
        predicted_class=predicted_class,
        trust_score=trust_score,
    )
