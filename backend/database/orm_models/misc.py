"""SQLAlchemy ORM models for remaining MongoDB collections migrated to PostgreSQL."""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any, Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from database.orm_base import Base

# Referenced tables already declared in learner.py
# (users, flashcards) — skip duplicate declarations here.


# ─────────────────────────────────────────────────────────
# pets
# ─────────────────────────────────────────────────────────

class PetORM(Base):
    __tablename__ = "pets"
    __table_args__ = (
        UniqueConstraint("pet_id", name="pets_pet_id_key"),
        Index("idx_pets_category", "category"),
        Index("idx_pets_rarity", "rarity"),
        Index("idx_pets_is_active", "is_active"),
        {"info": {"alembic_managed": False}},  # Exists in Supabase — Alembic SQL, not ORM
    )

    pet_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    name_vi: Mapped[str] = mapped_column(String(200), default="")
    model_url: Mapped[str] = mapped_column(String(500))
    texture_url: Mapped[Optional[str]] = mapped_column(String(500))
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500))
    category: Mapped[str] = mapped_column(String(50), default="character")
    pack_source: Mapped[str] = mapped_column(String(100), default="kenney_blocky-characters")
    rarity: Mapped[str] = mapped_column(String(20), default="common")
    color: Mapped[str] = mapped_column(String(20), default="#FF6B6B")
    animations: Mapped[list[Any]] = mapped_column(JSONB, default=lambda: ["idle"])
    unlock_condition: Mapped[dict[str, Any]] = mapped_column(JSONB, default=lambda: {"type": "free", "value": 0})
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


# ─────────────────────────────────────────────────────────
# chat_logs
# ─────────────────────────────────────────────────────────

class ChatLogORM(Base):
    __tablename__ = "chat_logs"
    __table_args__ = (
        Index("idx_chat_logs_session_id", "session_id"),
        Index("idx_chat_logs_timestamp", "timestamp"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    session_id: Mapped[str] = mapped_column(String(100))
    user_id: Mapped[Optional[str]] = mapped_column(String(100))
    message: Mapped[str] = mapped_column(Text)
    sender: Mapped[str] = mapped_column(String(10))  # "user" | "ai"
    context_flashcard_ids: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), default=None)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ─────────────────────────────────────────────────────────
# learning_paths
# ─────────────────────────────────────────────────────────

class LearningPathORM(Base):
    __tablename__ = "learning_paths"
    __table_args__ = (
        UniqueConstraint("user_id", name="learning_paths_user_id_key"),
        {"info": {"alembic_managed": False}},  # Exists in Supabase
    )

    user_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    priority_topics: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    daily_time_goal_mins: Mapped[int] = mapped_column(Integer, default=15)
    daily_words_goal: Mapped[int] = mapped_column(Integer, default=5)
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())


# ─────────────────────────────────────────────────────────
# flashcard_editor
# ─────────────────────────────────────────────────────────

class FlashcardEditorORM(Base):
    __tablename__ = "flashcard_editor"
    __table_args__ = (
        Index("idx_flashcard_editor_flashcard_id", "flashcard_id"),
        Index("idx_flashcard_editor_created_by", "created_by"),
        Index("idx_flashcard_editor_created_at", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    flashcard_id: Mapped[str] = mapped_column(String(100))
    elements: Mapped[list[Any]] = mapped_column(JSONB, default=list)
    canvas_width: Mapped[int] = mapped_column(Integer, default=1056)
    canvas_height: Mapped[int] = mapped_column(Integer, default=816)
    qr_position_x: Mapped[int] = mapped_column(Integer, default=876)
    qr_position_y: Mapped[int] = mapped_column(Integer, default=636)
    qr_size: Mapped[int] = mapped_column(Integer, default=150)
    show_qr_in_export: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())


# ─────────────────────────────────────────────────────────
# gamification_events  (migrated from Beanie GamificationEventDocument)
# ─────────────────────────────────────────────────────────

class GamificationEventORM(Base):
    __tablename__ = "gamification_events"
    __table_args__ = (
        UniqueConstraint("user_id", "event_id", name="gamification_events_user_id_event_id_key"),
        Index("idx_gamification_events_user_id", "user_id"),
        Index("idx_gamification_events_status", "status"),
        Index("idx_gamification_events_created_at", "created_at"),
        {"info": {"alembic_managed": False}},  # Exists in Supabase
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[str] = mapped_column(String(100))
    event_id: Mapped[str] = mapped_column(String(100))
    action: Mapped[str] = mapped_column(String(50))
    source_type: Mapped[Optional[str]] = mapped_column(String(50))
    source_id: Mapped[Optional[str]] = mapped_column(String(200))
    attempt_id: Mapped[Optional[str]] = mapped_column(String(200))
    session_id: Mapped[Optional[str]] = mapped_column(String(200))
    learning_path_id: Mapped[Optional[str]] = mapped_column(String(200))
    xp_awarded: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="processing")  # processing | applied | rejected
    total_xp_after: Mapped[Optional[int]] = mapped_column(Integer)
    level_after: Mapped[Optional[int]] = mapped_column(Integer)
    xp_to_next_after: Mapped[Optional[int]] = mapped_column(Integer)
    extra: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    applied_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


# ─────────────────────────────────────────────────────────
# session_logs  (migrated from Beanie SessionLogDocument)
# ─────────────────────────────────────────────────────────

class SessionLogORM(Base):
    __tablename__ = "session_logs"
    __table_args__ = (
        Index("idx_session_logs_user_id", "user_id"),
        Index("idx_session_logs_started_at", "started_at"),
        Index("idx_session_logs_user_started", "user_id", "started_at"),
        Index("idx_session_logs_active_topic", "active_topic", "started_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[str] = mapped_column(String(100))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer)
    break_reminder_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    active_topic: Mapped[Optional[str]] = mapped_column(String(100))
    words_learned: Mapped[int] = mapped_column(Integer, default=0)
    games_played: Mapped[int] = mapped_column(Integer, default=0)
    pronunciation_attempts: Mapped[int] = mapped_column(Integer, default=0)


# ─────────────────────────────────────────────────────────
# pronunciation_attempts  (migrated from Beanie PronunciationAttemptDocument)
# ─────────────────────────────────────────────────────────

class PronunciationAttemptORM(Base):
    __tablename__ = "pronunciation_attempts"
    __table_args__ = (
        UniqueConstraint("attempt_id", name="pronunciation_attempts_attempt_id_key"),
        Index("idx_pron_attempts_user_id", "user_id"),
        Index("idx_pron_attempts_flashcard_qr_id", "flashcard_qr_id"),
        Index("idx_pron_attempts_user_flashcard", "user_id", "flashcard_qr_id"),
        Index("idx_pron_attempts_user_recent", "user_id", "attempted_at"),
        Index("idx_pron_attempts_course_lesson", "course_id", "lesson_id"),
        Index("idx_pron_attempts_status", "status"),
        Index("idx_pron_attempts_attempted_at", "attempted_at"),
        {"info": {"alembic_managed": False}},  # Exists in Supabase
    )

    attempt_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(100))
    flashcard_qr_id: Mapped[str] = mapped_column(String(100))
    audio_url: Mapped[Optional[str]] = mapped_column(String(500))
    audio_duration_seconds: Mapped[Optional[int]] = mapped_column(Integer)
    bucket: Mapped[str] = mapped_column(String(50), default="pronunciations")
    storage_path: Mapped[Optional[str]] = mapped_column(String(500))
    spoken_text: Mapped[str] = mapped_column(Text)
    target_text: Mapped[Optional[str]] = mapped_column(Text)
    score: Mapped[int] = mapped_column(Integer, default=0)
    pronunciation_score: Mapped[int] = mapped_column(Integer, default=0)
    fluency_score: Mapped[int] = mapped_column(Integer, default=0)
    clarity_score: Mapped[int] = mapped_column(Integer, default=0)
    ai_model: Mapped[Optional[str]] = mapped_column(String(100))
    evaluation_confidence: Mapped[float] = mapped_column(SmallInteger, default=0.0)
    feedback: Mapped[Optional[str]] = mapped_column(Text)
    word_by_word_feedback: Mapped[list[Any]] = mapped_column(JSONB, default=list)
    course_id: Mapped[Optional[str]] = mapped_column(String(100))
    lesson_id: Mapped[Optional[str]] = mapped_column(String(100))
    section_id: Mapped[Optional[str]] = mapped_column(String(100))
    session_id: Mapped[Optional[str]] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    xp_awarded: Mapped[int] = mapped_column(Integer, default=0)
    device_info: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    client_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    attempted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ─────────────────────────────────────────────────────────
# lesson_sessions  (migrated from Beanie UserSession)
# Reuses LessonSessionORM from learner.py — additional session-logic fields
# ─────────────────────────────────────────────────────────

class UserSessionORM(Base):
    __tablename__ = "user_sessions"
    __table_args__ = (
        UniqueConstraint("session_id", name="user_sessions_session_id_key"),
        Index("idx_user_sessions_user_id", "user_id"),
        Index("idx_user_sessions_status", "status"),
        Index("idx_user_sessions_user_status", "user_id", "status"),
        Index("idx_user_sessions_user_started", "user_id", "started_at"),
        Index("idx_user_sessions_course_started", "course_id", "started_at"),
        Index("idx_user_sessions_lesson_started", "lesson_id", "started_at"),
    )

    session_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="active")
    session_type: Mapped[str] = mapped_column(String(20), default="learning")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    total_duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    active_duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    paused_duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    course_id: Mapped[Optional[str]] = mapped_column(String(100))
    lesson_id: Mapped[Optional[str]] = mapped_column(String(100))
    active_topic: Mapped[Optional[str]] = mapped_column(String(100))
    activities: Mapped[list[Any]] = mapped_column(JSONB, default=list)
    words_learned: Mapped[int] = mapped_column(Integer, default=0)
    games_played: Mapped[int] = mapped_column(Integer, default=0)
    pronunciation_attempts: Mapped[int] = mapped_column(Integer, default=0)
    quiz_score: Mapped[Optional[int]] = mapped_column(Integer)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0)
    streak_maintained: Mapped[bool] = mapped_column(Boolean, default=False)
    break_count: Mapped[int] = mapped_column(Integer, default=0)
    break_reminder_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    device_info: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    client_timezone: Mapped[Optional[str]] = mapped_column(String(50))
    engagement_score: Mapped[float] = mapped_column(SmallInteger, default=0.0)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
