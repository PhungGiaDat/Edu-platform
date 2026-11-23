# backend/models/learning_path.py
"""
Learning Path Models - PostgreSQL via repositories

Stores a user's chosen topic priorities and daily learning goals.
All database operations go through learning path repositories (PostgreSQL).
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class LearningPathCreate(BaseModel):
    user_id: str
    priority_topics: List[str] = Field(default_factory=list)
    daily_time_goal_mins: int = Field(default=15, ge=5, le=120)
    daily_words_goal: int = Field(default=5, ge=1, le=50)
    notifications_enabled: bool = True


class LearningPathUpdate(BaseModel):
    priority_topics: Optional[List[str]] = None
    daily_time_goal_mins: Optional[int] = Field(default=None, ge=5, le=120)
    daily_words_goal: Optional[int] = Field(default=None, ge=1, le=50)
    notifications_enabled: Optional[bool] = None


class LearningPathResponse(BaseModel):
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
