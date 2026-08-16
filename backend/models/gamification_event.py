# backend/models/gamification_event.py
"""
GamificationEvent Model - Idempotent XP Event Ledger

Provides exactly-once XP award semantics via UNIQUE(user_id, event_id).

This is a separate collection from user_points to support:
- Event replay without duplicate XP
- Semantic source tracking for future reward eligibility
- Audit trail for XP awards
- MongoDB → PostgreSQL future migration readiness
"""
from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Literal
from datetime import datetime
from enum import Enum


class EventStatus(str, Enum):
    """Gamification event processing states."""
    PROCESSING = "processing"
    APPLIED = "applied"
    REJECTED = "rejected"


class GamificationEventDocument(Document):
    """
    Gamification event stored in MongoDB.
    Collection: gamification_events

    UNIQUE(user_id, event_id) index ensures exactly-once semantics.

    Invariant: event existence alone != XP definitely applied.
    Status must be checked for accurate replay semantics.
    """
    # Primary key components
    user_id: Indexed(str)
    event_id: Indexed(str)

    # Event semantics
    action: str  # Maps to XP_REWARDS[action]
    source_type: Optional[str] = None  # lesson, flashcard, game, pronunciation, ar_combo
    source_id: Optional[str] = None  # lesson-123, qr-456, attempt-789, combo-cat-dog

    # Optional contextual IDs
    attempt_id: Optional[str] = None  # For pronunciation: maps directly to event_id
    session_id: Optional[str] = None
    learning_path_id: Optional[str] = None

    # Result snapshot
    xp_awarded: int = 0
    status: EventStatus = EventStatus.PROCESSING

    # Progression snapshot at time of award
    total_xp_after: Optional[int] = None
    level_after: Optional[int] = None
    xp_to_next_after: Optional[int] = None

    # Flexible metadata bucket
    metadata: Dict[str, Any] = Field(default_factory=dict)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    applied_at: Optional[datetime] = None

    class Settings:
        name = "gamification_events"
        # NOTE: Indexes are defined centrally in backend/database/indexes.py
        # DO NOT add duplicate index definitions here


# ========== API Schemas ==========

class AddXPEventRequest(BaseModel):
    """Request to add XP with idempotency via event_id."""
    action: str
    event_id: str

    # Optional semantic source
    source_type: Optional[str] = None
    source_id: Optional[str] = None

    # Optional contextual IDs
    attempt_id: Optional[str] = None
    session_id: Optional[str] = None
    learning_path_id: Optional[str] = None

    # Legacy compatibility
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "action": "pronunciation_attempt",
                    "event_id": "attempt-abc123",
                    "source_type": "pronunciation",
                    "source_id": "qr-cat",
                    "attempt_id": "attempt-abc123",
                    "metadata": {"score": 85}
                },
                {
                    "action": "lesson_completed",
                    "event_id": "lesson-animals-001",
                    "source_type": "lesson",
                    "source_id": "lesson-animals-001",
                    "metadata": {}
                }
            ]
        }


class AddXPEventResponse(BaseModel):
    """Response from idempotent XP event processing."""
    success: bool
    event_id: str
    action: str

    # XP result
    xp_awarded: int = 0
    total_xp_after: int = 0
    level_after: int = 1
    xp_to_next_after: int = 100
    level_up: bool = False

    # Idempotency info
    idempotent_replay: bool = False  # True if this was a replay
    status: str = "applied"

    # Additional rewards
    badges_earned: list[str] = Field(default_factory=list)
    sticker_earned: Optional[Dict[str, Any]] = None
    streak: int = 0

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "success": True,
                    "event_id": "attempt-abc123",
                    "action": "pronunciation_attempt",
                    "xp_awarded": 15,
                    "total_xp_after": 150,
                    "level_after": 2,
                    "xp_to_next_after": 150,
                    "level_up": True,
                    "idempotent_replay": False,
                    "status": "applied",
                    "badges_earned": [],
                    "sticker_earned": None,
                    "streak": 1
                }
            ]
        }


class XPConflictError(BaseModel):
    """Response when event_id conflicts with different semantics."""
    error: str = "IDEMPOTENCY_CONFLICT"
    message: str
    existing_event: Dict[str, Any]
