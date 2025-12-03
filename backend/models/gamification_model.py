from pydantic import BaseModel, Field
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

class BadgeSchema(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    name: str
    description: str
    icon_url: str
    criteria: str  # e.g., "complete_5_lessons"

class UserPointsSchema(BaseModel):
    user_id: str  # Supabase User ID
    total_points: int = 0
    level: int = 1
    badges: List[str] = []  # List of Badge IDs
    streak_days: int = 0
    last_activity_date: Optional[datetime] = None

    class Config:
        json_encoders = {
            ObjectId: str
        }
        populate_by_name = True

class LeaderboardEntrySchema(BaseModel):
    user_id: str
    username: str
    avatar_url: Optional[str] = None
    points: int
    rank: int
