# backend/models/session_log.py
"""
Session Log Models - PostgreSQL via repositories

Logs each learning session (start → end). Backend is log-only.
Data feeds the Progress Report (time spent per topic/day).
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ========== API Schemas ==========

class SessionStartRequest(BaseModel):
    """Request body to start a session."""
    user_id: str
    active_topic: Optional[str] = None


class SessionEndRequest(BaseModel):
    """Request body to end/close a session."""
    break_reminder_sent: bool = False


class SessionLogResponse(BaseModel):
    """Response schema for a session log entry."""
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    break_reminder_sent: bool
    active_topic: Optional[str] = None

    class Config:
        from_attributes = True
        populate_by_name = True


class SessionSummary(BaseModel):
    """Aggregated session stats for a user."""
    user_id: str
    total_sessions: int
    total_time_seconds: int
    average_session_seconds: float
    longest_session_seconds: int
    most_studied_topic: Optional[str] = None
