from typing import List, Optional
from pydantic import BaseModel, Field


class PronunciationWord(BaseModel):
    word_id: str = Field(..., description="Unique word identifier")
    word: str = Field(..., description="The word text")
    phonetic: Optional[str] = Field(None, description="Phonetic transcription")
    difficulty: str = Field(..., pattern="^(easy|medium|hard)$")
    audio_url: Optional[str] = None


class PronunciationCourseDocument(BaseModel):
    topic_id: str
    name: str
    name_vi: str
    icon: str
    color: str
    words: List[PronunciationWord] = []
    order: int = 0


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
    words: List[PronunciationWord]
    progress: dict


class PronunciationAttemptLog(BaseModel):
    user_id: str
    topic_id: str
    word_id: str
    score: float
    stars: int
    transcription: str
    evaluation_method: str  # "browser" | "huggingface"
    created_at: Optional[str] = None


class PronunciationProgressResponse(BaseModel):
    total_words_learned: int
    words_per_topic: List[dict]
    favorite_topic: Optional[dict]
    total_stars: int
    current_streak: int
