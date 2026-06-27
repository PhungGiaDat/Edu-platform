# backend/models/session_tracking.py
"""
Session Tracking Models - Extended session management with heartbeat and app lock
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class SessionState(str, Enum):
    ACTIVE = "active"
    IDLE = "idle"
    LOCKED = "locked"
    ENDED = "ended"


class HeartbeatRequest(BaseModel):
    """Request body for session heartbeat."""
    session_id: str
    current_step_id: Optional[str] = None
    current_step_index: Optional[int] = None
    progress_percent: Optional[int] = None


class HeartbeatResponse(BaseModel):
    """Response from heartbeat endpoint."""
    session_id: str
    status: SessionState
    last_heartbeat: datetime
    idle_seconds: int = 0
    total_time_seconds: int
    is_locked: bool = False


class SessionStatusResponse(BaseModel):
    """Current session status."""
    session_id: Optional[str] = None
    user_id: str
    status: SessionState
    started_at: Optional[datetime] = None
    last_heartbeat: Optional[datetime] = None
    total_time_seconds: int = 0
    idle_time_seconds: int = 0
    current_step_id: Optional[str] = None
    current_step_index: int = 0
    progress_percent: int = 0
    is_locked: bool = False
    locked_at: Optional[datetime] = None
    locked_reason: Optional[str] = None


class AppLockRequest(BaseModel):
    """Request to lock the app (parental control)."""
    session_id: str
    reason: Optional[str] = None
    lock_duration_minutes: Optional[int] = None


class AppLockResponse(BaseModel):
    """Response after locking app."""
    session_id: str
    status: SessionState
    locked_at: datetime
    locked_until: Optional[datetime] = None
    message: str


class SessionActivityLog(BaseModel):
    """Log of session activity for analytics."""
    log_id: str = Field(default_factory=lambda: str(datetime.utcnow().timestamp()))
    session_id: str
    user_id: str
    activity_type: str
    activity_data: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class SessionMetrics(BaseModel):
    """Aggregated session metrics."""
    user_id: str
    total_sessions: int = 0
    total_time_seconds: int = 0
    average_session_seconds: float = 0.0
    longest_session_seconds: int = 0
    sessions_today: int = 0
    time_today_seconds: int = 0
    current_streak_days: int = 0
    last_session_date: Optional[datetime] = None
