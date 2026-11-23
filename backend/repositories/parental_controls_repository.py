# backend/repositories/parental_controls_repository.py
"""
Parental Controls Repository - Data Access Layer (PostgreSQL)

De-Mongo Wave 5: PostgreSQL is the sole persistence path.
The Mongo ``parental_controls`` collection is replaced by ``public.parental_controls``.
All methods use raw SQL via ``postgres_pool()`` and return plain dicts.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from database.postgres_connection import postgres_pool
import json
import logging

logger = logging.getLogger(__name__)


class ParentalControlsRepository:
    """Repository for public.parental_controls table."""

    @staticmethod
    def _row(row) -> Optional[Dict[str, Any]]:
        """Convert an asyncpg Record to a plain dict."""
        if row is None:
            return None
        return dict(row)

    async def get_by_child_id(self, child_id: str) -> Optional[Dict[str, Any]]:
        """Get parental controls for a child."""
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.parental_controls WHERE child_id=$1",
            child_id,
        )
        return self._row(row)

    async def set_time_limit(self, child_id: str, time_limit_mins: int) -> bool:
        """Set daily time limit for a child (upsert)."""
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.parental_controls (child_id, time_limit_mins, updated_at)
               VALUES ($1, $2, NOW())
               ON CONFLICT (child_id)
               DO UPDATE SET time_limit_mins=EXCLUDED.time_limit_mins, updated_at=NOW()
               RETURNING child_id""",
            child_id, time_limit_mins,
        )
        return row is not None

    async def set_break_reminder(self, child_id: str, break_mins: int) -> bool:
        """Set break reminder interval (upsert)."""
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.parental_controls (child_id, break_reminder_mins, updated_at)
               VALUES ($1, $2, NOW())
               ON CONFLICT (child_id)
               DO UPDATE SET break_reminder_mins=EXCLUDED.break_reminder_mins, updated_at=NOW()
               RETURNING child_id""",
            child_id, break_mins,
        )
        return row is not None

    async def set_learning_path(self, child_id: str, priority_topics: List[str]) -> bool:
        """Set learning path priorities (upsert)."""
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.parental_controls (child_id, priority_topics, updated_at)
               VALUES ($1, $2::jsonb, NOW())
               ON CONFLICT (child_id)
               DO UPDATE SET priority_topics=EXCLUDED.priority_topics, updated_at=NOW()
               RETURNING child_id""",
            child_id, json.dumps(priority_topics, ensure_ascii=False),
        )
        return row is not None

    async def log_session(self, child_id: str, session_mins: int) -> bool:
        """Log a learning session, incrementing today's usage (upsert)."""
        today = date.today()
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.parental_controls
                   (child_id, today_usage_mins, last_session_date, updated_at)
               VALUES ($1, $2, $3, NOW())
               ON CONFLICT (child_id)
               DO UPDATE SET
                   today_usage_mins = public.parental_controls.today_usage_mins + EXCLUDED.today_usage_mins,
                   last_session_date = EXCLUDED.last_session_date,
                   updated_at = NOW()
               RETURNING child_id""",
            child_id, session_mins, today,
        )
        return row is not None


def get_parental_controls_repository() -> ParentalControlsRepository:
    return ParentalControlsRepository()