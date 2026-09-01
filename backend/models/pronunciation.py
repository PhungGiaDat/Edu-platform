# backend/models/pronunciation.py
"""
Pronunciation Attempt Models - PostgreSQL via repositories

Stores each time a child attempts to pronounce a word.
Enhanced with AI evaluation scores and detailed feedback.
Audio files are stored in Supabase.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class AttemptStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class PronunciationAttemptCreate(BaseModel):
    """Request body to log a pronunciation attempt and award XP."""
    user_id: str
    flashcard_qr_id: str
    spoken_text: str
    target_text: Optional[str] = None
    score: int = Field(default=0, ge=0, le=100)
    pronunciation_score: Optional[int] = Field(default=None, ge=0, le=100)
    fluency_score: Optional[int] = Field(default=None, ge=0, le=100)
    clarity_score: Optional[int] = Field(default=None, ge=0, le=100)
    feedback: Optional[str] = None
    audio_url: Optional[str] = None
    audio_duration_seconds: Optional[int] = None
    course_id: Optional[str] = None
    lesson_id: Optional[str] = None
    section_id: Optional[str] = None
    session_id: Optional[str] = None
    ai_model: Optional[str] = None
    evaluation_confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    word_by_word_feedback: Optional[List[Dict[str, Any]]] = None


class PronunciationAttemptResponse(BaseModel):
    """Response after logging an attempt."""
    id: Optional[str] = Field(None, alias="_id")
    attempt_id: str
    user_id: str
    flashcard_qr_id: str
    spoken_text: str
    target_text: Optional[str] = None
    score: int
    pronunciation_score: Optional[int] = None
    fluency_score: Optional[int] = None
    clarity_score: Optional[int] = None
    feedback: Optional[str] = None
    audio_url: Optional[str] = None
    course_id: Optional[str] = None
    lesson_id: Optional[str] = None
    section_id: Optional[str] = None
    session_id: Optional[str] = None
    status: AttemptStatus
    xp_awarded: int = 0
    attempted_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True


class PronunciationHistoryItem(BaseModel):
    """Single entry in a user's pronunciation history for one word."""
    id: str
    spoken_text: str
    target_text: Optional[str] = None
    score: int
    pronunciation_score: Optional[int] = None
    feedback: Optional[str] = None
    attempted_at: datetime


class PronunciationStats(BaseModel):
    """Aggregated pronunciation stats for one (user, word) pair."""
    flashcard_qr_id: str
    total_attempts: int
    best_score: int
    average_score: float
    last_attempted_at: Optional[datetime] = None
    history: List[PronunciationHistoryItem] = []
