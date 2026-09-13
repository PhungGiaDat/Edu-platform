"""Add rag_traces — Ops Monitoring Dashboard P1 (RAG request traces).

Creates the Lexi Agentic-RAG trace table consumed by
``/api/v1/admin/monitoring/rag/*`` (docs/plan/20260912_ops_dashboard.md §4.1).
Writes are fire-and-forget and gated by settings.MONITORING_ENABLED.

revision: 20260913_rag_traces
down_revision: 20260814_orm_baseline
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260913_rag_traces"
down_revision: Union[str, None] = "20260814_orm_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.create_table(
        "rag_traces",
        sa.Column(
            "id",
            sa.BigInteger(),
            sa.Identity(always=True),
            primary_key=True,
        ),
        sa.Column(
            "request_id",
            postgresql.UUID(as_uuid=False),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("user_hash", sa.String(length=64), nullable=True),
        sa.Column("session_id", sa.String(length=100), nullable=False),
        sa.Column("language", sa.String(length=8), nullable=True),
        sa.Column("question", sa.String(length=500), nullable=True),
        sa.Column("model_requested", sa.String(length=120), nullable=True),
        sa.Column("model_used", sa.String(length=120), nullable=True),
        sa.Column(
            "fallback", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
        sa.Column(
            "cache_hit", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
        sa.Column("stage_planner_ms", sa.Integer(), nullable=True),
        sa.Column("stage_retrieval_ms", sa.Integer(), nullable=True),
        sa.Column("stage_generator_ms", sa.Integer(), nullable=True),
        sa.Column("stage_validator_ms", sa.Integer(), nullable=True),
        sa.Column("total_ms", sa.Integer(), nullable=True),
        sa.Column("tokens_prompt", sa.Integer(), nullable=True),
        sa.Column("tokens_completion", sa.Integer(), nullable=True),
        sa.Column("token_calls", sa.Integer(), nullable=True),
        sa.Column(
            "tokens_by_model",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("sources_count", sa.Integer(), nullable=True),
        sa.Column(
            "source_ids",
            postgresql.ARRAY(sa.Text()),
            server_default=sa.text("'{}'::text[]"),
            nullable=False,
        ),
        sa.Column("hit1", sa.Boolean(), nullable=True),
        sa.Column("hit3", sa.Boolean(), nullable=True),
        sa.Column("validator_verdict", sa.String(length=40), nullable=True),
        sa.Column(
            "refusal", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column(
            "trace_segments",
            postgresql.ARRAY(sa.Text()),
            server_default=sa.text("'{}'::text[]"),
            nullable=False,
        ),
        sa.UniqueConstraint("request_id", name="rag_traces_request_id_key"),
        schema=None,
    )
    op.create_index(
        "idx_rag_traces_created", "rag_traces", ["created_at"], unique=False
    )
    op.create_index(
        "idx_rag_traces_session", "rag_traces", ["session_id"], unique=False
    )
    op.create_index(
        "idx_rag_traces_model", "rag_traces", ["model_used"], unique=False
    )
    op.create_index(
        "idx_rag_traces_problems",
        "rag_traces",
        ["created_at"],
        unique=False,
        postgresql_where=sa.text("error IS NOT NULL OR refusal"),
    )


def downgrade() -> None:
    op.drop_index("idx_rag_traces_problems", table_name="rag_traces")
    op.drop_index("idx_rag_traces_model", table_name="rag_traces")
    op.drop_index("idx_rag_traces_session", table_name="rag_traces")
    op.drop_index("idx_rag_traces_created", table_name="rag_traces")
    op.drop_table("rag_traces")
