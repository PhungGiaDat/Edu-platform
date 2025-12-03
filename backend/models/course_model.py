from pydantic import BaseModel, Field
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

class VideoSchema(BaseModel):
    title: str
    url: str
    duration_seconds: int
    thumbnail_url: Optional[str] = None

class LessonSchema(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    title: str
    description: str
    video: Optional[VideoSchema] = None
    content: Optional[str] = None  # Markdown content
    order: int
    is_completed: bool = False # For user progress tracking (response only)

class CourseSchema(BaseModel):
    title: str
    description: str
    level: str  # beginner, intermediate, advanced
    thumbnail_url: Optional[str] = None
    lessons: List[LessonSchema] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_published: bool = False

    class Config:
        json_encoders = {
            ObjectId: str
        }
        populate_by_name = True
