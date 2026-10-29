"""Data structures shared across the inference pipeline."""

from dataclasses import dataclass

from PIL import Image


@dataclass
class DetectionResult:
    """Result of detecting and classifying a fruit in a photo.

    Attributes:
        annotated_image: Original photo with the detection box drawn on it.
        cropped_image: Region of the photo that contains the fruit.
        predicted_class: Predicted quality class (``Fresh``, ``Mild`` or ``Rotten``).
        trust_score: Confidence of the predicted class, between 0 and 1.
    """

    annotated_image: Image.Image
    cropped_image: Image.Image
    predicted_class: str
    trust_score: float
