# backend/models/course_lesson.py
"""
CourseLesson Document - MongoDB Collection
Enhanced lesson schema with video/image fields and AI evaluation support
"""
from beanie import Document, Indexed
from pydantic import BaseModel, Field
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
    type: str  # video, image, audio
    status: str = "pending"  # pending, ready, failed
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
    pronunciation: Optional[str] = None  # IPA
    difficulty: str = "easy"


class CourseLesson(Document):
    """
    Course Lesson Document - MongoDB collection: course_lessons
    
    Stores individual lesson content with video/image support.
    """
    lesson_id: Indexed(str, unique=True)
    course_id: Indexed(str)  # Reference to courses collection
    title: str
    title_vi: str = ""
    description: Optional[str] = None
    order: int
    
    # Lesson type and structure
    lesson_type: LessonType = LessonType.MIXED
    status: LessonStatus = LessonStatus.DRAFT
    
    # Media content
    thumbnail: Optional[MediaAsset] = None
    preview_video: Optional[MediaAsset] = None
    full_video: Optional[MediaAsset] = None
    
    # Content sections
    vocabulary_items: List[VocabularyItem] = Field(default_factory=list)
    
    # Metadata
    duration_minutes: int = Field(default=5, ge=1, le=60)
    xp_reward: int = Field(default=50, ge=0, le=500)
    
    # Prerequisites and unlocks
    prerequisites: List[str] = Field(default_factory=list)  # lesson_ids
    unlocks_lesson_ids: List[str] = Field(default_factory=list)
    
    # Statistics (denormalized)
    total_attempts: int = 0
    completion_rate: float = 0.0
    average_score: float = 0.0
    
    # AI generation status
    ai_generated: bool = False
    generation_prompt: Optional[str] = None
    
    # Ownership
    created_by: Indexed(str)
    updated_by: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    
    class Settings:
        name = "course_lessons"
        indexes: list = [
            # Unique identifier
            [("lesson_id", 1)],
            # Foreign key lookups
            [("course_id", 1)],
            # Course ordering
            [("course_id", 1), ("order", 1)],  # Ordered lessons within course
            # Status/type queries
            [("status", 1)],
            [("lesson_type", 1)],
            [("status", 1), ("lesson_type", 1)],  # Combined status + type
            # Creator queries
            [("created_by", 1)],
            [("created_by", 1), ("status", 1)],  # Creator's content by status
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "lesson_id": "lesson_001",
                "course_id": "course_001",
                "title": "Colors in English",
                "title_vi": "Màu sắc bằng tiếng Anh",
                "lesson_type": "vocabulary",
                "status": "published",
                "vocabulary_items": [
                    {
                        "word_id": "word_red",
                        "word_en": "red",
                        "word_vi": "đỏ",
                        "image": {"url": "https://...", "type": "image"},
                        "audio": {"url": "https://...", "type": "audio"}
                    }
                ],
                "duration_minutes": 5,
                "xp_reward": 50
            }
        }
