"""Baseline for the live schema produced by historical SQL migrations."""

revision = "20260814_orm_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Intentionally empty: this revision is stamped, never applied to recreate history.
    pass


def downgrade() -> None:
    raise RuntimeError("The historical PostgreSQL baseline is immutable")
