"""Backward-compatible AR response with additive native-tracking metadata."""
from typing import Any, List, Optional
from pydantic import BaseModel

from .flashcard import FlashcardSchema
from .ar_object import ArObjectSchema
from .ar_combination import ArCombinationSchema


class ARExperienceResponseSchema(BaseModel):
    # Current RN wire fields.
    qr_id: str
    word: str
    translation_vi: str
    audio_url: Optional[str] = None
    model_url: str
    animation_type: str
    glb_size: float
    position: str
    rotation: str
    scale: str
    reference_image_url: Optional[str] = None
    physical_width_m: Optional[float] = None

    # Legacy Web consumers can continue to use the composed objects.
    flashcard: FlashcardSchema
    target: ArObjectSchema
    related_combos: List[ArCombinationSchema] = []
    tracking_target: Optional[dict[str, Any]] = None
