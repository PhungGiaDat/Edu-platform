"""SQLAlchemy ORM models for the in-app Ops Monitoring Dashboard.

Only tables created by Alembic revisions live here (unlike misc.py, which
mirrors pre-existing Supabase tables). ``rag_traces`` is owned by revision
``20260913_rag_traces``.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Identity,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from database.orm_base import Base


class RAGTraceORM(Base):
    """One row per Lexi Agentic-RAG chat request (fire-and-forget write)."""

    __tablename__ = "rag_traces"
    __table_args__ = (
        UniqueConstraint("request_id", name="rag_traces_request_id_key"),
        Index("idx_rag_traces_created", "created_at"),
        Index("idx_rag_traces_session", "session_id"),
        Index("idx_rag_traces_model", "model_used"),
        Index(
            "idx_rag_traces_problems",
            "created_at",
            postgresql_where=text("error IS NOT NULL OR refusal"),
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    request_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), server_default=text("gen_random_uuid()")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user_hash: Mapped[Optional[str]] = mapped_column(String(64))
    session_id: Mapped[str] = mapped_column(String(100))
    language: Mapped[Optional[str]] = mapped_column(String(8))
    question: Mapped[Optional[str]] = mapped_column(String(500))

    model_requested: Mapped[Optional[str]] = mapped_column(String(120))
    model_used: Mapped[Optional[str]] = mapped_column(String(120))
    fallback: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    cache_hit: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))

    stage_planner_ms: Mapped[Optional[int]] = mapped_column(Integer)
    stage_retrieval_ms: Mapped[Optional[int]] = mapped_column(Integer)
    stage_generator_ms: Mapped[Optional[int]] = mapped_column(Integer)
    stage_validator_ms: Mapped[Optional[int]] = mapped_column(Integer)
    total_ms: Mapped[Optional[int]] = mapped_column(Integer)

    tokens_prompt: Mapped[Optional[int]] = mapped_column(Integer)
    tokens_completion: Mapped[Optional[int]] = mapped_column(Integer)
    token_calls: Mapped[Optional[int]] = mapped_column(Integer)
    tokens_by_model: Mapped[dict] = mapped_column(
        JSONB, server_default=text("'{}'::jsonb")
    )

    sources_count: Mapped[Optional[int]] = mapped_column(Integer)
    source_ids: Mapped[list] = mapped_column(
        ARRAY(Text), server_default=text("'{}'::text[]")
    )

    # Benchmark-import slots (NULL for live traffic until scores are backfilled)
    hit1: Mapped[Optional[bool]] = mapped_column(Boolean)
    hit3: Mapped[Optional[bool]] = mapped_column(Boolean)

    validator_verdict: Mapped[Optional[str]] = mapped_column(String(40))
    refusal: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    error: Mapped[Optional[str]] = mapped_column(Text)
    trace_segments: Mapped[list] = mapped_column(
        ARRAY(Text), server_default=text("'{}'::text[]")
    )
