# backend/models/user_session.py
"""
UserSession Models - PostgreSQL via repositories

Tracks user learning sessions with detailed time tracking.
"""
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
    activity_type: str
    target_id: str
    started_at: datetime
    duration_seconds: int = 0
    completed: bool = False
    score: Optional[int] = None
