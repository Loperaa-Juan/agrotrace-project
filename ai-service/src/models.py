from dataclasses import dataclass

from PIL import Image


@dataclass
class DetectionResult:
    """Represents the result of an object detection operation."""

    annotated_image: Image.Image
    cropped_image: Image.Image
    predicted_class: str
    trust_score: float
