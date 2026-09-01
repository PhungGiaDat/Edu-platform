# backend/models/course_lesson.py
"""
CourseLesson Models - PostgreSQL via repositories

Enhanced lesson schema with video/image fields and AI evaluation support.
All database operations go through CourseLessonRepository (PostgreSQL).
"""
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class LessonStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    DEPRECATED = "deprecated"


class LessonType(str, Enum):
    VIDEO = "video"
    VOCABULARY = "vocabulary"
    PRONUNCIATION = "pronunciation"
    QUIZ = "quiz"
    GAME = "game"
    READING = "reading"
    MIXED = "mixed"


class MediaAsset(BaseModel):
    """Media asset reference with metadata"""
    url: str
    bucket: str = "learnar-assets"
    path: str
    type: str
    status: str = "pending"
    duration_seconds: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    thumbnail_url: Optional[str] = None


class VocabularyItem(BaseModel):
    """Embedded vocabulary item"""
    word_id: str
    word_en: str
    word_vi: str
    image: MediaAsset
    audio: MediaAsset
    pronunciation: Optional[str] = None
    difficulty: str = "easy"


class CourseLessonSchema(BaseModel):
    """
    Plain Pydantic DTO for CourseLesson API responses (PostgreSQL-only).
    ``extra="ignore"`` lets repository rows carry Postgres-only columns
    without breaking response validation.
    """
    lesson_id: str
    course_id: str
    title: str
    title_vi: str = ""
    description: Optional[str] = None
    order: int
    lesson_type: LessonType = LessonType.MIXED
    status: LessonStatus = LessonStatus.DRAFT
    thumbnail: Optional[MediaAsset] = None
    preview_video: Optional[MediaAsset] = None
    full_video: Optional[MediaAsset] = None
    vocabulary_items: List[VocabularyItem] = Field(default_factory=list)
    duration_minutes: int = Field(default=5, ge=1, le=60)
    xp_reward: int = Field(default=50, ge=0, le=500)
    prerequisites: List[str] = Field(default_factory=list)
    unlocks_lesson_ids: List[str] = Field(default_factory=list)
    total_attempts: int = 0
    completion_rate: float = 0.0
    average_score: float = 0.0
    ai_generated: bool = False
    generation_prompt: Optional[str] = None
    created_by: str = "system"
    updated_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None

    model_config = ConfigDict(extra="ignore", from_attributes=True)
