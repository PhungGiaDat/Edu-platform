from typing import List, Optional
from pydantic import BaseModel, Field


class PronunciationWord(BaseModel):
    word_id: str = Field(..., description="Unique word identifier within a topic")
    topic_id: str
    word: str = Field(..., description="The English word text")
    phonetic: Optional[str] = Field(None, description="IPA phonetic transcription")
    difficulty: str = Field(..., pattern="^(easy|medium|hard)$")
    audio_url: Optional[str] = None
    display_order: int = 0


class PronunciationWordWithStars(PronunciationWord):
    """Word response enriched with user's best stars from PostgreSQL."""
    best_stars: int = Field(0, ge=0, le=3)


class PronunciationCourseListResponse(BaseModel):
    id: str
    topic_id: str
    name: str
    name_vi: str
    icon: str
    color: str
    word_count: int
    completion_percent: float = 0.0


class PronunciationCourseDetailResponse(BaseModel):
    id: str
    topic_id: str
    name: str
    name_vi: str
    icon: str
    color: str
    words: List[PronunciationWordWithStars]
    progress: dict


class PronunciationAttemptLog(BaseModel):
    user_id: str
    topic_id: str
    word_id: str
    score: float = Field(..., ge=0, le=100)
    stars: int = Field(..., ge=0, le=3)
    transcription: str
    evaluation_method: str = Field(
        default="browser",
        pattern="^(browser|huggingface|combined)$",
    )
    created_at: Optional[str] = None


class PronunciationProgressResponse(BaseModel):
    total_words_learned: int = 0
    words_per_topic: List[dict] = Field(default_factory=list)
    favorite_topic: Optional[dict] = None
    total_stars: int = 0
    current_streak: int = 0
