# backend/models/gamification_event.py
"""
GamificationEvent Models - PostgreSQL via repositories

Idempotent XP event ledger. UNIQUE(user_id, event_id) ensures exactly-once semantics.
All database operations go through PostgresGamificationService (PostgreSQL).
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class EventStatus(str, Enum):
    PROCESSING = "processing"
    APPLIED = "applied"
    REJECTED = "rejected"


class AddXPEventRequest(BaseModel):
    action: str
    event_id: str
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    attempt_id: Optional[str] = None
    session_id: Optional[str] = None
    learning_path_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AddXPEventResponse(BaseModel):
    success: bool
    event_id: str
    action: str
    xp_awarded: int = 0
    total_xp_after: int = 0
    level_after: int = 1
    xp_to_next_after: int = 100
    level_up: bool = False
    idempotent_replay: bool = False
    status: str = "applied"
    badges_earned: list[str] = Field(default_factory=list)
    sticker_earned: Optional[Dict[str, Any]] = None
    streak: int = 0


class XPConflictError(BaseModel):
    error: str = "IDEMPOTENCY_CONFLICT"
    message: str
    existing_event: Dict[str, Any]
