# models/flashcard.py
"""
Flashcard Models - PostgreSQL via repositories

All database operations go through FlashcardRepository (PostgreSQL).
Pydantic schemas are used for API request/response validation.
"""
from pydantic import BaseModel, Field
from typing import Dict, Optional, List
from datetime import datetime


# ========== Pydantic Schemas (API) ==========
class FlashcardCreate(BaseModel):
    """Schema for creating a new flashcard"""
    qr_id: str
    word: str
    translation: Dict[str, str]
    definition: Optional[str] = None
    category: str
    image_url: str
    audio_url: Optional[str] = None
    difficulty: str = "easy"
    ar_tag: Optional[str] = None
    image_animation_type: Optional[str] = None


class FlashcardUpdate(BaseModel):
    """Schema for updating flashcard - all fields optional"""
    word: Optional[str] = None
    translation: Optional[Dict[str, str]] = None
    definition: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    difficulty: Optional[str] = None
    ar_tag: Optional[str] = None
    image_animation_type: Optional[str] = None


class FlashcardResponse(BaseModel):
    """Schema for API responses"""
    id: Optional[str] = Field(None, alias="_id")
    qr_id: str
    word: str
    translation: Dict[str, str]
    definition: Optional[str] = None
    category: str
    image_url: str
    audio_url: Optional[str] = None
    difficulty: str
    ar_tag: Optional[str] = None
    image_animation_type: Optional[str] = None
    has_embedding: bool = False

    class Config:
        from_attributes = True
        populate_by_name = True


class FlashcardSchema(BaseModel):
    """Legacy flashcard schema - kept for backward compatibility"""
    qr_id: str
    word: str
    translation: Dict[str, str] = Field(..., description="Từ vựng và bản dịch của nó")
    category: str
    image_url: str
    audio_url: Optional[str] = None
    difficulty: str
    ar_tag: Optional[str] = None
    image_animation_type: Optional[str] = None

    class Config:
        populate_by_name = True
