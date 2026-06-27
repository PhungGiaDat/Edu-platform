# backend/models/lesson_media.py
"""
Lesson Media Models - Pydantic schemas for media assets and lesson progress
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class MediaType(str, Enum):
    VIDEO = "video"
    IMAGE = "image"
    AUDIO = "audio"
    STICKER = "sticker"
    MODEL = "model"
    TEXTURE = "texture"
    MIND = "mind"


class MediaStatus(str, Enum):
    PENDING = "pending"
    GENERATING = "generating"
    READY = "ready"
    FAILED = "failed"


class MediaUploadResponse(BaseModel):
    """Response after successful media upload."""
    asset_id: str
    bucket: str
    path: str
    public_url: Optional[str] = None
    type: MediaType
    status: MediaStatus = MediaStatus.READY
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MediaAsset(BaseModel):
    """Media asset associated with a lesson."""
    asset_id: str = Field(default_factory=lambda: str(datetime.utcnow().timestamp()))
    course_id: str
    lesson_id: str
    section_id: Optional[str] = None
    asset_key: str
    bucket: str = "learnar-assets"
    path: str
    type: MediaType
    status: MediaStatus = MediaStatus.READY
    public_url: Optional[str] = None
    provider: str = "supabase"
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class LessonWithMedia(BaseModel):
    """Lesson enriched with media assets."""
    lesson_id: str
    title: str
    description: Optional[str] = None
    video_url: Optional[str] = None
    video_thumbnail: Optional[str] = None
    video_duration_seconds: Optional[int] = None
    images: List[str] = Field(default_factory=list)
    audio_url: Optional[str] = None
    generated_media: List[MediaAsset] = Field(default_factory=list)
    ar_reference: Optional[Dict[str, Any]] = None


class LessonProgressStatus(str, Enum):
    NOT_STARTED = "not_started"
    STARTED = "started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class StepProgress(BaseModel):
    """Progress for individual lesson steps."""
    step_id: str
    step_type: str
    status: LessonProgressStatus = LessonProgressStatus.NOT_STARTED
    best_score: int = 0
    attempts: int = 0
    completed: bool = False
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class LessonProgressResponse(BaseModel):
    """User's progress through a lesson."""
    lesson_id: str
    user_id: str
    status: LessonProgressStatus
    current_step_index: int = 0
    progress_percent: int = 0
    steps: List[StepProgress] = Field(default_factory=list)
    total_time_seconds: int = 0
    started_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class MediaUploadRequest(BaseModel):
    """Request to upload media for a lesson."""
    lesson_id: str
    section_id: Optional[str] = None
    type: MediaType
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MediaDeleteRequest(BaseModel):
    """Request to delete media from a lesson."""
    asset_ids: List[str]
