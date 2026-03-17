# backend/models/session_log.py
"""
Session Log Models - Beanie Document + API Schemas

Logs each learning session (start → end). Backend is log-only —
records duration data without enforcement. The frontend
(useSessionTimer + BreakReminder) handles time limits and reminders.

Data feeds the Progress Report (time spent per topic/day).
"""
from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ========== Beanie Document (MongoDB) ==========

class SessionLogDocument(Document):
    """
    Learning session log stored in MongoDB.
    Collection: session_logs

    Created when a session starts (POST /api/v1/sessions/start).
    Updated when a session ends (PATCH /api/v1/sessions/{id}/end).
    """
    user_id: Indexed(str)

    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None

    # Total seconds computed server-side when session ends.
    # None if session is still active or ended abnormally.
    duration_seconds: Optional[int] = None

    # True if the BreakReminder component fired during this session.
    # Set by the frontend when calling the end-session endpoint.
    break_reminder_sent: bool = False

    # Which topic/category was active during this session
    # (used in progress reports to show "most studied topic")
    active_topic: Optional[str] = None

    class Settings:
        name = "session_logs"
        indexes = [
            "user_id",
            [("user_id", 1), ("started_at", -1)],
        ]


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
    """Aggregated session stats for a user (used in Progress Report)."""
    user_id: str
    total_sessions: int
    total_time_seconds: int
    average_session_seconds: float
    longest_session_seconds: int
    most_studied_topic: Optional[str] = None
