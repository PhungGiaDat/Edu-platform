# backend/models/notebook_entry.py
"""
Pydantic models for Notebook Entry (Sổ tay)
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from enum import Enum


class EntrySource(str, Enum):
    AI_TRANSLATION = "ai_translation"
    FLASHCARD = "flashcard"
    MANUAL = "manual"
    WORD_LOOKUP = "word_lookup"


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
    translation_en: Optional[str] = Field(
        None, description="English synonym/definition"
    )
    context: Optional[str] = Field(
        None, description="Sentence context where word was discovered"
    )
    source: EntrySource = Field(..., description="How the word was added")
    topic: Optional[str] = Field(None, max_length=100, description="Topic slug")
    difficulty: Optional[Difficulty] = Field(None, description="Word difficulty")
    pronunciation: Optional[str] = Field(
        None, max_length=100, description="IPA pronunciation"
    )
    part_of_speech: Optional[str] = Field(
        None, max_length=50, description="Part of speech"
    )
    definition_en: Optional[str] = Field(None, description="English definition")
    wiki_summary: Optional[str] = Field(None, description="Wikipedia summary excerpt")
    explanation_vi: Optional[str] = Field(
        None, description="Kid-friendly Vietnamese explanation (1-2 câu)"
    )


class NotebookEntryUpdate(BaseModel):
    """Update an existing notebook entry"""

    word: Optional[str] = Field(None, min_length=1, max_length=255)
    translation_vi: Optional[str] = Field(None, min_length=1)
    translation_en: Optional[str] = None
    context: Optional[str] = None
    topic: Optional[str] = Field(None, max_length=100)
    difficulty: Optional[Difficulty] = None
    pronunciation: Optional[str] = Field(None, max_length=100)
    part_of_speech: Optional[str] = Field(None, max_length=50)
    definition_en: Optional[str] = None
    wiki_summary: Optional[str] = None
    explanation_vi: Optional[str] = None


class ReviewSubmit(BaseModel):
    """Submit a review result (kid SM-2, no-fail box ladder)"""

    entry_id: UUID = Field(..., description="Notebook entry ID")
    quality: int = Field(
        ...,
        ge=0,
        le=5,
        description="Kid UX sends 1 (relearn) or 5 (know); 3-4 reserved for future variants",
    )
    # Stable per-swipe id from the client. Same id on retry → idempotent
    # (no double SM-2 apply, no double XP). Absent → legacy behaviour.
    event_id: Optional[str] = Field(
        None, max_length=100, description="Client-generated idempotency key"
    )


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
    user_id: str
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
    pronunciation: Optional[str] = None
    part_of_speech: Optional[str] = None
    definition_en: Optional[str] = None
    wiki_summary: Optional[str] = None
    explanation_vi: Optional[str] = None
    mastery_box: int = Field(
        1, ge=1, le=5, description="Kid Leitner box 1-5 (seed→bloom)"
    )

    class Config:
        from_attributes = True


class ReviewResultResponse(BaseModel):
    """Response after submitting a review (extended additively for kid UX)"""

    entry_id: UUID
    quality: int
    new_ease_factor: float
    new_interval_days: int
    next_review_at: datetime
    review_count: int
    # Kid progress (additive — old clients can ignore)
    mastery_box: int = Field(1, ge=1, le=5)
    box_up: bool = False
    # Reward processing (backend-authoritative, idempotent via event_id)
    xp_awarded: Optional[int] = None
    total_xp: Optional[int] = None
    level: Optional[int] = None
    level_up: Optional[bool] = None
    sticker_earned: Optional[Dict[str, Any]] = None


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
