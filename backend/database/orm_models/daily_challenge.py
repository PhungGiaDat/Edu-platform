"""SQLAlchemy mappings for the Daily Challenge reward ledger tables."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    SmallInteger,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from database.orm_base import Base


class DailyChallengeORM(Base):
    __tablename__ = "daily_challenges"
    __table_args__ = (
        CheckConstraint("target_lessons > 0", name="daily_challenges_target_lessons_check"),
        CheckConstraint(
            "status IN ('draft', 'published', 'archived')",
            name="daily_challenges_status_check",
        ),
        {"info": {"alembic_managed": False}},
    )

    challenge_id: Mapped[str] = mapped_column(Text, primary_key=True)
    challenge_date: Mapped[date] = mapped_column(Date, unique=True)
    title: Mapped[str] = mapped_column(Text)
    target_lessons: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(Text, default="published", server_default=text("'published'"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DailyChallengeLessonORM(Base):
    __tablename__ = "daily_challenge_lessons"
    __table_args__ = (
        UniqueConstraint("challenge_id", "position"),
        CheckConstraint("position > 0", name="daily_challenge_lessons_position_check"),
        Index("idx_daily_challenge_lessons_lesson", "lesson_id", "course_id"),
        {"info": {"alembic_managed": False}},
    )

    challenge_id: Mapped[str] = mapped_column(
        ForeignKey("daily_challenges.challenge_id", ondelete="CASCADE"),
        primary_key=True,
    )
    course_id: Mapped[str] = mapped_column(
        ForeignKey("courses.course_id", ondelete="RESTRICT"),
    )
    lesson_id: Mapped[str] = mapped_column(
        ForeignKey("lessons.lesson_id", ondelete="RESTRICT"),
        primary_key=True,
    )
    position: Mapped[int] = mapped_column(SmallInteger)


class DailyChallengeRewardORM(Base):
    __tablename__ = "daily_challenge_rewards"
    __table_args__ = (
        UniqueConstraint("challenge_id", "reward_type", name="uq_daily_challenge_reward_type"),
        CheckConstraint(
            "reward_type IN ('xp', 'badge', 'pet')",
            name="daily_challenge_rewards_type_check",
        ),
        CheckConstraint(
            "xp_amount IS NULL OR xp_amount >= 0",
            name="daily_challenge_rewards_xp_amount_check",
        ),
        CheckConstraint(
            "(reward_type = 'xp' AND xp_amount IS NOT NULL AND badge_id IS NULL AND pet_id IS NULL) "
            "OR (reward_type = 'badge' AND xp_amount IS NULL AND badge_id IS NOT NULL AND pet_id IS NULL) "
            "OR (reward_type = 'pet' AND xp_amount IS NULL AND badge_id IS NULL AND pet_id IS NOT NULL)",
            name="ck_daily_challenge_reward_payload",
        ),
        {"info": {"alembic_managed": False}},
    )

    reward_id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    challenge_id: Mapped[str] = mapped_column(
        ForeignKey("daily_challenges.challenge_id", ondelete="CASCADE"),
    )
    reward_type: Mapped[str] = mapped_column(Text)
    xp_amount: Mapped[Optional[int]] = mapped_column(Integer)
    badge_id: Mapped[Optional[str]] = mapped_column(Text)
    pet_id: Mapped[Optional[str]] = mapped_column(ForeignKey("pets.pet_id", ondelete="RESTRICT"))
    display_label: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DailyChallengeClaimORM(Base):
    __tablename__ = "daily_challenge_claims"
    __table_args__ = (
        UniqueConstraint("user_id", "challenge_id"),
        UniqueConstraint("user_id", "event_id"),
        CheckConstraint(
            "status IN ('processing', 'applied', 'failed')",
            name="daily_challenge_claims_status_check",
        ),
        CheckConstraint(
            "progress_at_claim >= 0",
            name="daily_challenge_claims_progress_check",
        ),
        CheckConstraint("xp_awarded >= 0", name="daily_challenge_claims_xp_check"),
        CheckConstraint(
            "status <> 'applied' OR claimed_at IS NOT NULL",
            name="ck_daily_challenge_claim_applied_at",
        ),
        Index("idx_daily_challenge_claims_user_recent", "user_id", "created_at"),
        {"info": {"alembic_managed": False}},
    )

    claim_id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    challenge_id: Mapped[str] = mapped_column(
        ForeignKey("daily_challenges.challenge_id", ondelete="RESTRICT"),
    )
    event_id: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, default="processing", server_default=text("'processing'"))
    progress_at_claim: Mapped[int] = mapped_column(Integer)
    xp_awarded: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    badge_id: Mapped[Optional[str]] = mapped_column(Text)
    pet_id: Mapped[Optional[str]] = mapped_column(ForeignKey("pets.pet_id", ondelete="RESTRICT"))
    grant_result: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    claimed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
