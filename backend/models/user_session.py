# backend/models/user_session.py
"""
UserSession Document - Session tracking with time management
"""
from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class SessionStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    EXPIRED = "expired"
    ABANDONED = "abandoned"


class ActivityEntry(BaseModel):
    """Single activity during session"""
    activity_type: str  # lesson, game, quiz, pronunciation
    target_id: str  # lesson_id, game_id, etc.
    started_at: datetime
    duration_seconds: int = 0
    completed: bool = False
    score: Optional[int] = None


class UserSession(Document):
    """
    User Session Document - MongoDB collection: user_sessions
    
    Tracks user learning sessions with detailed time tracking.
    TTL: Auto-delete completed sessions after 180 days.
    """
    session_id: Indexed(str, unique=True)
    user_id: Indexed(str)
    
    # Session metadata
    status: SessionStatus = SessionStatus.ACTIVE
    session_type: str = "learning"  # learning, game, quiz
    
    # Time tracking
    started_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    
    # Duration calculations
    total_duration_seconds: int = 0
    active_duration_seconds: int = 0  # Excludes paused time
    paused_duration_seconds: int = 0
    
    # Session context
    course_id: Optional[str] = None
    lesson_id: Optional[str] = None
    active_topic: Optional[str] = None
    
    # Activities during session
    activities: List[ActivityEntry] = Field(default_factory=list)
    
    # Learning metrics
    words_learned: int = 0
    games_played: int = 0
    pronunciation_attempts: int = 0
    quiz_score: Optional[int] = None
    
    # Gamification
    xp_earned: int = 0
    streak_maintained: bool = False
    
    # Break tracking
    break_count: int = 0
    break_reminder_sent: bool = False
    
    # Device/session info
    device_info: Optional[Dict[str, Any]] = Field(default_factory=dict)
    client_timezone: Optional[str] = None
    
    # Session quality metrics
    engagement_score: float = 0.0  # Calculated from activity patterns
    
    # TTL index (180 days for completed sessions)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    
    class Settings:
        name = "user_sessions"
        indexes = [
            "session_id",
            "user_id",
            ("user_id", "status"),
            ("user_id", "started_at"),
            "status",
            ("status", "started_at"),
            ("course_id", "started_at"),
            ("lesson_id", "started_at"),
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "session_001",
                "user_id": "user_001",
                "status": "completed",
                "total_duration_seconds": 1800,
                "words_learned": 5,
                "games_played": 2,
                "xp_earned": 120,
                "streak_maintained": True
            }
        }
