# backend/models/pronunciation.py
"""
Pronunciation Attempt Models - Beanie Document + API Schemas

Stores each time a child attempts to pronounce a word.
Audio files are stored in Supabase; audio_url points to the Supabase public URL.
Scores are integers 0-100 for kid-friendly display.
"""
from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ========== Beanie Document (MongoDB) ==========

class PronunciationAttemptDocument(Document):
    """
    Pronunciation attempt stored in MongoDB.
    Collection: pronunciation_attempts

    One document per attempt. Multiple attempts per (user, flashcard) are expected
    — the UI shows history and encourages retry.
    """
    user_id: Indexed(str)            # Reference to UserDocument._id (as string)
    flashcard_qr_id: Indexed(str)    # The word being practiced

    # What the child actually said (from SpeechRecognition transcription)
    spoken_text: str

    # Score 0–100. Calculated client-side by SpeechService.scorePronunciation()
    # and sent to the backend for persistence + XP award.
    score: int = Field(..., ge=0, le=100)

    # Encouraging AI feedback string (from Gemini via ai_service.analyze_pronunciation)
    feedback: Optional[str] = None

    # Supabase public URL for the child's recorded audio (optional — uploaded async)
    # Format: https://<project>.supabase.co/storage/v1/object/public/pronunciations/<uuid>.webm
    audio_url: Optional[str] = None

    attempted_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "pronunciation_attempts"
        indexes = [
            "user_id",
            "flashcard_qr_id",
            [("user_id", 1), ("flashcard_qr_id", 1)],
            [("user_id", 1), ("attempted_at", -1)],
        ]


# ========== API Schemas ==========

class PronunciationAttemptCreate(BaseModel):
    """Request body to log a pronunciation attempt and award XP."""
    user_id: str
    flashcard_qr_id: str
    spoken_text: str
    score: int = Field(..., ge=0, le=100)
    feedback: Optional[str] = None
    audio_url: Optional[str] = None  # Supabase URL, set after async upload


class PronunciationAttemptResponse(BaseModel):
    """Response after logging an attempt."""
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    flashcard_qr_id: str
    spoken_text: str
    score: int
    feedback: Optional[str] = None
    audio_url: Optional[str] = None
    attempted_at: datetime
    xp_awarded: Optional[int] = None  # XP given for this attempt

    class Config:
        from_attributes = True
        populate_by_name = True


class PronunciationHistoryItem(BaseModel):
    """Single entry in a user's pronunciation history for one word."""
    id: str
    spoken_text: str
    score: int
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
