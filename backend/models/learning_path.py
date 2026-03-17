# backend/models/learning_path.py
"""
Learning Path Models - Beanie Document + API Schemas

Stores a user's chosen topic priorities and daily learning goals.
One document per user (upserted on save). Topic IDs match the
AVAILABLE_TOPICS list in frontend LearningPathSetup.tsx.
"""
from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ========== Beanie Document (MongoDB) ==========

class LearningPathDocument(Document):
    """
    User's learning path preferences stored in MongoDB.
    Collection: learning_paths

    One document per user. Re-saved (upserted) every time the user
    updates their preferences in LearningPathSetup.
    """
    user_id: Indexed(str, unique=True)   # One path per user

    # Ordered list of topic IDs the child wants to focus on.
    # IDs match AVAILABLE_TOPICS in LearningPathSetup.tsx:
    # e.g. ["animals", "food", "colors", "family", ...]
    priority_topics: List[str] = Field(default_factory=list)

    # Daily session goals (mirrors LearningPathSetup.tsx DailyGoals)
    daily_time_goal_mins: int = Field(default=15, ge=5, le=120)
    daily_words_goal: int = Field(default=5, ge=1, le=50)

    # Push/in-app notification preference (managed by parent)
    notifications_enabled: bool = True

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Settings:
        name = "learning_paths"
        indexes = [
            "user_id",
        ]


# ========== API Schemas ==========

class LearningPathCreate(BaseModel):
    """Request body to save/update a user's learning path."""
    user_id: str
    priority_topics: List[str] = Field(default_factory=list)
    daily_time_goal_mins: int = Field(default=15, ge=5, le=120)
    daily_words_goal: int = Field(default=5, ge=1, le=50)
    notifications_enabled: bool = True


class LearningPathResponse(BaseModel):
    """Response schema for a user's learning path."""
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    priority_topics: List[str]
    daily_time_goal_mins: int
    daily_words_goal: int
    notifications_enabled: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True


class LearningPathUpdate(BaseModel):
    """Partial update schema — all fields optional."""
    priority_topics: Optional[List[str]] = None
    daily_time_goal_mins: Optional[int] = Field(default=None, ge=5, le=120)
    daily_words_goal: Optional[int] = Field(default=None, ge=1, le=50)
    notifications_enabled: Optional[bool] = None
