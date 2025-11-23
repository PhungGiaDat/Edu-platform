# backend/models/flashcard.py
"""
Flashcard Models - Request/Response Schemas
"""
from pydantic import BaseModel, Field
from typing import Dict, Optional
from bson import ObjectId


class FlashcardSchema(BaseModel):
    """Flashcard schema matching database structure"""
    qr_id: str
    word: str
    translation: Dict[str, str] = Field(..., description="Từ vựng và bản dịch của nó")
    category: str
    image_url: str
    audio_url: Optional[str] = None
    difficulty: str
    ar_tag: Optional[str] = None
    
    class Config:
        json_encoders = {
            ObjectId: str
        }
        populate_by_name = True