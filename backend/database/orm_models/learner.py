"""Learner-core SQLAlchemy mappings for the verified Supabase schema."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import BigInteger, Boolean, CheckConstraint, Column, DateTime, ForeignKey, ForeignKeyConstraint, Index, Integer, Table, Text, UniqueConstraint, desc, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.orm_base import Base

# Referenced by learner-core foreign keys but outside the current Alembic scope.
Table("users", Base.metadata, Column("id", Text, primary_key=True), info={"alembic_managed": False})
Table("flashcards", Base.metadata, Column("qr_id", Text, primary_key=True), info={"alembic_managed": False})


class CourseORM(Base):
    __tablename__ = "courses"
    __table_args__ = (
        CheckConstraint("level IN ('beginner', 'intermediate', 'advanced')", name="ck_courses_level"),
        Index("idx_courses_category_key", "category_key"),
        Index("idx_courses_published", "is_published"),
    )

    course_id: Mapped[str] = mapped_column(Text, primary_key=True)
    title: Mapped[str] = mapped_column(Text)
    title_vi: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[Optional[str]] = mapped_column(Text)
    description_vi: Mapped[str] = mapped_column(Text, default="")
    thumbnail_url: Mapped[Optional[str]] = mapped_column(Text)
    subtitle_vi: Mapped[str] = mapped_column(Text, default="")
    theme: Mapped[str] = mapped_column(Text, default="")
    category_key: Mapped[str] = mapped_column(Text, default="")
    category_label: Mapped[str] = mapped_column(Text, default="")
    category_icon: Mapped[str] = mapped_column(Text, default="")
    age_range: Mapped[str] = mapped_column(Text, default="5-8")
    level: Mapped[str] = mapped_column(Text)
    thumbnail: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)
    is_published: Mapped[bool] = mapped_column(Boolean)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    catalog_preview: Mapped[list[Any]] = mapped_column(JSONB, default=list)
    student_testimonials: Mapped[list[Any]] = mapped_column(JSONB, default=list)
    enrollment_cta: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)
    lessons: Mapped[list["LessonORM"]] = relationship(back_populates="course", lazy="selectin")


class LessonORM(Base):
    __tablename__ = "lessons"
    __table_args__ = (
        UniqueConstraint("course_id", "lesson_order", name="lessons_course_id_lesson_order_key"),
        CheckConstraint("duration_minutes >= 0", name="lessons_duration_minutes_check"),
        Index("idx_lessons_course_id", "course_id"),
    )

    lesson_id: Mapped[str] = mapped_column(Text, primary_key=True)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.course_id", ondelete="RESTRICT", name="lessons_course_id_fkey"))
    title: Mapped[str] = mapped_column(Text)
    title_vi: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[Optional[str]] = mapped_column(Text)
    lesson_order: Mapped[int] = mapped_column(Integer)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=3)
    content: Mapped[Optional[str]] = mapped_column(Text)
    video: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)
    media: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)
    learning_blocks: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    reward: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)
    ar_reference: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)
    generated_media: Mapped[list[Any]] = mapped_column(JSONB, default=list)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    course: Mapped[CourseORM] = relationship(back_populates="lessons")
    sessions: Mapped[list["LessonSessionORM"]] = relationship(back_populates="lesson", lazy="selectin")


class LessonSessionORM(Base):
    __tablename__ = "lesson_sessions"
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", "lesson_id", name="lesson_sessions_user_id_course_id_lesson_id_key"),
        CheckConstraint("content_version >= 1", name="lesson_sessions_content_version_check"),
        CheckConstraint("progress_percent BETWEEN 0 AND 100", name="lesson_sessions_progress_percent_check"),
    )

    session_id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT", name="lesson_sessions_user_id_fkey"))
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.course_id", ondelete="RESTRICT", name="lesson_sessions_course_id_fkey"))
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.lesson_id", ondelete="RESTRICT", name="lesson_sessions_lesson_id_fkey"))
    content_version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(Text, default="started")
    current_step_id: Mapped[str] = mapped_column(Text)
    current_step_index: Mapped[int] = mapped_column(Integer, default=0)
    progress_percent: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    lesson: Mapped[LessonORM] = relationship(back_populates="sessions")
    steps: Mapped[list["LessonSessionStepORM"]] = relationship(back_populates="session", lazy="selectin")


class LessonSessionStepORM(Base):
    __tablename__ = "lesson_session_steps"
    __table_args__ = (
        CheckConstraint("activity_order IS NULL OR activity_order >= 1", name="lesson_session_steps_activity_order_check"),
        CheckConstraint("attempts >= 0", name="lesson_session_steps_attempts_check"),
        CheckConstraint("best_score >= 0", name="lesson_session_steps_best_score_check"),
        Index("idx_lesson_session_steps_authored_order", "session_id", "activity_order", "step_id"),
    )

    session_id: Mapped[str] = mapped_column(ForeignKey("lesson_sessions.session_id", ondelete="RESTRICT", name="lesson_session_steps_session_id_fkey"), primary_key=True)
    step_id: Mapped[str] = mapped_column(Text, primary_key=True)
    title: Mapped[str] = mapped_column(Text, default="")
    activity_type: Mapped[Optional[str]] = mapped_column(Text)
    activity_order: Mapped[Optional[int]] = mapped_column(Integer)
    required: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(Text, default="locked")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    best_score: Mapped[int] = mapped_column(Integer, default=0)
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    last_response: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    session: Mapped[LessonSessionORM] = relationship(back_populates="steps")
    attempts_rows: Mapped[list["LessonStepAttemptORM"]] = relationship(back_populates="session_step", lazy="selectin", primaryjoin="and_(LessonSessionStepORM.session_id == foreign(LessonStepAttemptORM.session_id), LessonSessionStepORM.step_id == foreign(LessonStepAttemptORM.step_id))")


class LessonStepAttemptORM(Base):
    __tablename__ = "lesson_step_attempts"
    __table_args__ = (
        CheckConstraint("score BETWEEN 0 AND 100", name="lesson_step_attempts_score_check"),
        Index("idx_lesson_step_attempts_session", "session_id", desc("attempted_at")),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("lesson_sessions.session_id", ondelete="RESTRICT", name="lesson_step_attempts_session_id_fkey"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT", name="lesson_step_attempts_user_id_fkey"))
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.course_id", ondelete="RESTRICT", name="lesson_step_attempts_course_id_fkey"))
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.lesson_id", ondelete="RESTRICT", name="lesson_step_attempts_lesson_id_fkey"))
    step_id: Mapped[str] = mapped_column(Text)
    attempt_type: Mapped[str] = mapped_column(Text, default="practice")
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    score: Mapped[int] = mapped_column(Integer, default=0)
    response_data: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    attempted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    session_step: Mapped[LessonSessionStepORM] = relationship(back_populates="attempts_rows", primaryjoin="and_(foreign(LessonStepAttemptORM.session_id) == LessonSessionStepORM.session_id, foreign(LessonStepAttemptORM.step_id) == LessonSessionStepORM.step_id)")


class UserCourseProgressORM(Base):
    __tablename__ = "user_course_progress"
    __table_args__ = (
        CheckConstraint("status IN ('started', 'completed')", name="ck_user_course_progress_status"),
        CheckConstraint("total_xp >= 0", name="user_course_progress_total_xp_check"),
    )

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT", name="user_course_progress_user_id_fkey"), primary_key=True)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.course_id", ondelete="RESTRICT", name="user_course_progress_course_id_fkey"), primary_key=True)
    current_lesson_id: Mapped[Optional[str]] = mapped_column(ForeignKey("lessons.lesson_id", ondelete="SET NULL", name="user_course_progress_current_lesson_id_fkey"))
    status: Mapped[str] = mapped_column(Text, default="started")
    total_xp: Mapped[int] = mapped_column(Integer, default=0)
    rewards: Mapped[list[Any]] = mapped_column(JSONB, default=list)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class UserCourseLessonProgressORM(Base):
    __tablename__ = "user_course_lesson_progress"
    __table_args__ = (
        ForeignKeyConstraint(["user_id", "course_id"], ["user_course_progress.user_id", "user_course_progress.course_id"], ondelete="RESTRICT", name="user_course_lesson_progress_user_id_course_id_fkey"),
        CheckConstraint("best_score >= 0", name="user_course_lesson_progress_best_score_check"),
        CheckConstraint("attempts >= 0", name="user_course_lesson_progress_attempts_check"),
    )

    user_id: Mapped[str] = mapped_column(Text, primary_key=True)
    course_id: Mapped[str] = mapped_column(Text, primary_key=True)
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.lesson_id", ondelete="RESTRICT", name="user_course_lesson_progress_lesson_id_fkey"), primary_key=True)
    status: Mapped[str] = mapped_column(Text, default="not_started")
    best_score: Mapped[int] = mapped_column(Integer, default=0)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class WordMasteryORM(Base):
    __tablename__ = "word_mastery"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT", name="word_mastery_user_id_fkey"), primary_key=True)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.course_id", ondelete="RESTRICT", name="word_mastery_course_id_fkey"), primary_key=True)
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.lesson_id", ondelete="RESTRICT", name="word_mastery_lesson_id_fkey"), primary_key=True)
    word: Mapped[str] = mapped_column(Text, primary_key=True)
    mastery_level: Mapped[int] = mapped_column(Integer, default=0)
    metadata_: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, default=dict)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class MediaAssetORM(Base):
    __tablename__ = "media_assets"
    __table_args__ = (
        UniqueConstraint("course_id", "lesson_id", "section_id", "asset_key", "path", name="media_assets_course_id_lesson_id_section_id_asset_key_path_key"),
        Index("idx_media_assets_lesson", "course_id", "lesson_id", "section_id"),
    )
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.course_id", ondelete="RESTRICT", name="media_assets_course_id_fkey"))
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.lesson_id", ondelete="RESTRICT", name="media_assets_lesson_id_fkey"))
    section_id: Mapped[str] = mapped_column(Text)
    asset_key: Mapped[str] = mapped_column(Text)
    bucket: Mapped[str] = mapped_column(Text)
    path: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, default="pending")
    public_url: Mapped[Optional[str]] = mapped_column(Text)
    provider: Mapped[str] = mapped_column(Text, default="supabase")
    metadata_: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, default=dict)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
