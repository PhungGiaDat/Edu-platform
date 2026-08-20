# backend/models/notebook_entry.py
"""
Pydantic models for Notebook Entry (Sổ tay)
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class EntrySource(str, Enum):
    AI_TRANSLATION = "ai_translation"
    FLASHCARD = "flashcard"
    MANUAL = "manual"


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


# ─────────────────────────────────────────────────────────────
# Request Models
# ─────────────────────────────────────────────────────────────

class NotebookEntryCreate(BaseModel):
    """Create a new notebook entry"""
    word: str = Field(..., min_length=1, max_length=255, description="English word")
    translation_vi: str = Field(..., min_length=1, description="Vietnamese translation")
    translation_en: Optional[str] = Field(None, description="English synonym/definition")
    context: Optional[str] = Field(None, description="Sentence context where word was discovered")
    source: EntrySource = Field(..., description="How the word was added")
    topic: Optional[str] = Field(None, max_length=100, description="Topic slug")
    difficulty: Optional[Difficulty] = Field(None, description="Word difficulty")


class NotebookEntryUpdate(BaseModel):
    """Update an existing notebook entry"""
    word: Optional[str] = Field(None, min_length=1, max_length=255)
    translation_vi: Optional[str] = Field(None, min_length=1)
    translation_en: Optional[str] = None
    context: Optional[str] = None
    topic: Optional[str] = Field(None, max_length=100)
    difficulty: Optional[Difficulty] = None


class ReviewSubmit(BaseModel):
    """Submit a review result (SM-2 algorithm)"""
    entry_id: UUID = Field(..., description="Notebook entry ID")
    quality: int = Field(..., ge=0, le=5, description="SM-2 quality rating: 0-2=fail, 3=hard, 4=good, 5=easy")


# ─────────────────────────────────────────────────────────────
# Response Models
# ─────────────────────────────────────────────────────────────

class TranslationDisplay(BaseModel):
    """Translation display object"""
    vi: str
    en: Optional[str] = None


class NotebookEntryResponse(BaseModel):
    """Response model for notebook entry"""
    id: UUID
    user_id: UUID
    word: str
    translation_vi: str
    translation_en: Optional[str] = None
    context: Optional[str] = None
    source: str
    topic: Optional[str] = None
    difficulty: Optional[str] = None
    created_at: datetime
    last_reviewed_at: Optional[datetime] = None
    review_count: int = 0
    ease_factor: float = 2.5
    interval_days: int = 0
    next_review_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReviewResultResponse(BaseModel):
    """Response after submitting a review"""
    entry_id: UUID
    quality: int
    new_ease_factor: float
    new_interval_days: int
    next_review_at: datetime
    review_count: int


class NotebookListResponse(BaseModel):
    """Paginated list of notebook entries"""
    items: List[NotebookEntryResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class DueCardsResponse(BaseModel):
    """Cards due for review"""
    items: List[NotebookEntryResponse]
    count: int
