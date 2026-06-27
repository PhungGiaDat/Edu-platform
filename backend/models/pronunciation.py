# backend/models/pronunciation.py
"""
Pronunciation Attempt Models - Beanie Document + API Schemas

Stores each time a child attempts to pronounce a word.
Enhanced with AI evaluation scores and detailed feedback.
Audio files are stored in Supabase; audio_url points to the Supabase public URL.
Scores are integers 0-100 for kid-friendly display.
"""
from beanie import Document, Indexed
from pymongo import IndexModel
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class AttemptStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# ========== Beanie Document (MongoDB) ==========

class PronunciationAttemptDocument(Document):
    """
    Pronunciation attempt stored in MongoDB.
    Collection: pronunciation_attempts

    One document per attempt. Multiple attempts per (user, flashcard) are expected
    — the UI shows history and encourages retry.
    TTL: Auto-delete after 90 days.
    """
    attempt_id: Indexed(str, unique=True)
    user_id: Indexed(str)
    flashcard_qr_id: Indexed(str)

    # Audio reference
    audio_url: Optional[str] = None
    audio_duration_seconds: Optional[int] = None
    bucket: str = "pronunciations"
    storage_path: Optional[str] = None

    # Transcription and scoring
    spoken_text: str
    target_text: Optional[str] = None

    # Scores (0-100 scale)
    score: int = Field(default=0, ge=0, le=100)
    pronunciation_score: int = Field(default=0, ge=0, le=100)
    fluency_score: int = Field(default=0, ge=0, le=100)
    clarity_score: int = Field(default=0, ge=0, le=100)

    # AI Evaluation details
    ai_model: Optional[str] = None
    evaluation_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    feedback: Optional[str] = None  # Encouraging AI feedback
    word_by_word_feedback: List[Dict[str, Any]] = Field(default_factory=list)

    # Context
    course_id: Optional[str] = None
    lesson_id: Optional[str] = None
    section_id: Optional[str] = None
    session_id: Optional[str] = None

    # Status tracking
    status: AttemptStatus = AttemptStatus.PENDING

    # XP awarded
    xp_awarded: int = 0

    # Metadata
    device_info: Optional[Dict[str, Any]] = Field(default_factory=dict)
    client_timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Indexed for TTL (90 days = 7776000 seconds)
    attempted_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None  # Set to attempted_at + 90 days

    class Settings:
        name = "pronunciation_attempts"
        indexes: list = [
            # Unique identifiers
            [("attempt_id", 1)],
            # Foreign key lookups
            [("user_id", 1)],
            [("flashcard_qr_id", 1)],
            # Compound indexes for common queries
            [("user_id", 1), ("flashcard_qr_id", 1)],  # User's word history
            [("user_id", 1), ("attempted_at", -1)],  # User's recent attempts
            [("course_id", 1), ("lesson_id", 1)],  # Course/lesson context
            # Status indexes
            [("status", 1)],
            # Partial index for active processing (high-performance queue)
            IndexModel(
                [("status", 1)],
                partialFilterExpression={"status": "processing"},
                name="processing_status_partial",
            ),
            # TTL index for data retention (90 days)
            IndexModel(
                [("attempted_at", 1)],
                expireAfterSeconds=7776000,  # 90 days
                name="pronunciation_attempts_ttl",
            ),
        ]


# ========== API Schemas ==========

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
