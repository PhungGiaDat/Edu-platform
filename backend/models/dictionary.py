# backend/models/dictionary.py
"""
Pydantic models for AI Dictionary (Tra từ)
"""
from pydantic import BaseModel, Field
from typing import Optional, List


class TranslateRequest(BaseModel):
    """Request to translate text"""
    text: str = Field(..., min_length=1, max_length=500, description="English text to translate")
    context: Optional[str] = Field(None, max_length=1000, description="Context sentence/paragraph")
    target_lang: str = Field("vi", description="Target language code")


class WordBreakdown(BaseModel):
    """Individual word breakdown"""
    word: str
    pronunciation: Optional[str] = None
    part_of_speech: Optional[str] = None
    translation: str


class RelatedWord(BaseModel):
    """Related word from Qdrant context"""
    word: str
    translation: str
    relevance_score: Optional[float] = None


class TranslateResponse(BaseModel):
    """AI translation response"""
    original: str
    translation: dict  # {vi: str, literalTranslation?: str, contextualNote?: str}
    word_breakdown: Optional[List[WordBreakdown]] = None
    related_words: Optional[List[RelatedWord]] = None
    sources: Optional[List[str]] = None  # Qdrant sources used
