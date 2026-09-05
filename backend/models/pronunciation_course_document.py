# backend/models/pronunciation_course_document.py
"""
Pronunciation Course Document Models - MongoDB via Beanie

Stores pronunciation course topics, words, and user attempts.
"""
from beanie import Document, Indexed
from pydantic import Field
from typing import Optional, List
from datetime import datetime


class PronunciationWordDoc(Document):
    """Embedded word within a pronunciation course."""
    word_id: str
    word: str
    phonetic: Optional[str] = None
    difficulty: str = "easy"  # easy | medium | hard
    audio_url: Optional[str] = None


class PronunciationCourseDoc(Document):
    """Pronunciation course topic stored in MongoDB."""
    topic_id: Indexed(str, unique=True)
    name: str
    name_vi: str
    icon: str
    color: str  # sky-blue | coral-pink | lavender | mint-green
    words: List[PronunciationWordDoc] = []
    order: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "pronunciation_courses"
        indexes = ["topic_id", "order"]


class PronunciationAttemptDoc(Document):
    """User's pronunciation attempt stored in MongoDB."""
    user_id: Indexed(str)
    topic_id: Indexed(str)
    word_id: Indexed(str)
    score: float = Field(ge=0, le=100)
    stars: int = Field(ge=0, le=3)
    transcription: str
    evaluation_method: str = "browser"  # browser | huggingface
    audio_url: Optional[str] = None
    is_consent_granted: bool = False  # For data collection
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "pronunciation_attempts"
        indexes = [
            "user_id",
            ("user_id", "topic_id"),
            ("user_id", "word_id"),
            "-created_at",
        ]


class PronunciationRecordingDoc(Document):
    """Recording for wav2vec2 fine-tuning data collection."""
    user_id: Indexed(str)
    topic_id: str
    word_id: str
    audio_url: Optional[str] = None
    transcription: Optional[str] = None
    is_consent_granted: bool = False
    quality_rating: Optional[int] = Field(default=None, ge=1, le=5)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "pronunciation_recordings"
        indexes = [
            "user_id",
            ("user_id", "is_consent_granted"),
        ]
