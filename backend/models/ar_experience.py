# backend/models/ar_experience.py
"""
AR Experience Models - Complete AR response
"""
from pydantic import BaseModel
from typing import List
from .flashcard import FlashcardSchema
from .ar_object import ArObjectSchema
from .ar_combination import ArCombinationSchema


class ARExperienceResponseSchema(BaseModel):
    """Complete AR experience response schema"""
    flashcard: FlashcardSchema
    target: ArObjectSchema
    related_combos: List[ArCombinationSchema]
