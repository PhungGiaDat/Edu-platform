"""PostgreSQL repository for session logs (supplants Beanie SessionLogRepository)."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from database.postgres_connection import postgres_pool


class PostgresSessionLogRepository:
    async def create_session(
        self, user_id: str, active_topic: Optional[str] = None
    ) -> Dict[str, Any]:
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.session_logs(user_id,active_topic)
               VALUES($1,$2) RETURNING *""",
            user_id, active_topic,
        )
        return self._row(row)

    async def end_session(
        self,
        session_id: str,
        user_id: Optional[str] = None,
        break_reminder_sent: bool = False,
    ) -> Optional[Dict[str, Any]]:
        row = await postgres_pool().fetchrow(
            """UPDATE public.session_logs
               SET ended_at=now(),
                   break_reminder_sent=$2,
                   duration_seconds=EXTRACT(EPOCH FROM (now()-started_at))::int
               WHERE id=$1::bigint
               RETURNING *""",
            session_id, break_reminder_sent,
        )
        return self._row(row) if row else None

    async def get_summary(self, user_id: str) -> Dict[str, Any]:
        row = await postgres_pool().fetchrow(
            """SELECT
                   count(*)::int AS total_sessions,
                   coalesce(sum(duration_seconds),0)::int AS total_time_seconds,
                   coalesce(avg(duration_seconds),0)::float AS average_session_seconds,
                   coalesce(max(duration_seconds),0)::int AS longest_session_seconds
               FROM public.session_logs
               WHERE user_id=$1 AND ended_at IS NOT NULL""",
            user_id,
        )
        topic_row = await postgres_pool().fetchrow(
            """SELECT active_topic FROM public.session_logs
               WHERE user_id=$1 AND ended_at IS NOT NULL AND active_topic IS NOT NULL
               GROUP BY active_topic ORDER BY count(*) DESC LIMIT 1""",
            user_id,
        )
        return {
            "user_id": user_id,
            "total_sessions": row["total_sessions"] if row else 0,
            "total_time_seconds": row["total_time_seconds"] if row else 0,
            "average_session_seconds": round(row["average_session_seconds"], 1) if row else 0.0,
            "longest_session_seconds": row["longest_session_seconds"] if row else 0,
            "most_studied_topic": topic_row["active_topic"] if topic_row else None,
        }

    async def get_active_session(self, user_id: str) -> Optional[Dict[str, Any]]:
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.session_logs WHERE user_id=$1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
            user_id,
        )
        return self._row(row) if row else None

    @staticmethod
    def _row(row) -> Dict[str, Any]:
        return dict(row) if row else {}


def get_postgres_session_log_repository() -> PostgresSessionLogRepository:
    return PostgresSessionLogRepository()
