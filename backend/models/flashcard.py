# models/flashcard.py
"""
Flashcard Models - Beanie Documents and Pydantic Schemas

Architecture: Hybrid Database (Beanie for MongoDB)
- Beanie Document for database operations
- Pydantic schemas for API request/response
"""
from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Dict, Optional, List
from datetime import datetime


# ========== Beanie Document (MongoDB) ==========
class Flashcard(Document):
    """
    Flashcard Document - stored in MongoDB
    
    Collection: flashcards
    """
    qr_id: Indexed(str, unique=True)  # Unique identifier for QR code
    word: str
    translation: Dict[str, str] = Field(
        ..., 
        description="Translations in different languages, e.g., {'en': 'hello', 'vi': 'xin chào'}"
    )
    definition: Optional[str] = None  # Text description for embedding generation
    category: str
    image_url: str
    audio_url: Optional[str] = None
    difficulty: str = Field(default="easy")  # easy, medium, hard
    ar_tag: Optional[str] = None  # Reference to AR target/marker
    
    # AI Vector Embedding (768 dimensions for Gemini embedding-001)
    vector_embedding: Optional[List[float]] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Settings:
        name = "flashcards"  # MongoDB collection name
        indexes = [
            "category",
            "difficulty"
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "qr_id": "apple_001",
                "word": "apple",
                "translation": {"en": "apple", "vi": "quả táo"},
                "category": "fruits",
                "image_url": "/static/images/apple.png",
                "audio_url": "/static/audio/apple.mp3",
                "difficulty": "easy",
                "ar_tag": "apple_marker"
            }
        }


# ========== Pydantic Schemas (API) ==========
class FlashcardCreate(BaseModel):
    """Schema for creating a new flashcard"""
    qr_id: str
    word: str
    translation: Dict[str, str]
    definition: Optional[str] = None  # Text for AI embedding
    category: str
    image_url: str
    audio_url: Optional[str] = None
    difficulty: str = "easy"
    ar_tag: Optional[str] = None


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
    has_embedding: bool = False  # Indicates if vector_embedding exists
    
    class Config:
        from_attributes = True
        populate_by_name = True


# ========== Legacy Schema (Backward Compatibility) ==========
class FlashcardSchema(BaseModel):
    """
    Legacy flashcard schema - kept for backward compatibility
    Use FlashcardResponse for new code
    """
    qr_id: str
    word: str
    translation: Dict[str, str] = Field(..., description="Từ vựng và bản dịch của nó")
    category: str
    image_url: str
    audio_url: Optional[str] = None
    difficulty: str
    ar_tag: Optional[str] = None
    
    class Config:
        populate_by_name = True
