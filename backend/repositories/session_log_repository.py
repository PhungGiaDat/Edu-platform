# backend/repositories/session_log_repository.py
"""
Session Log Repository - Data Access Layer for session_logs table

De-Mongo Wave 4: PostgreSQL is the sole persistence path.  The Mongo fallback
(BaseRepository / _SafeCollection / _SafeCursor) has been removed.

Backend is log-only: records start/end times and duration.
Enforcement (break reminders, locking) is handled by the frontend.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from database.postgres_connection import postgres_pool
import logging

logger = logging.getLogger(__name__)


class SessionLogRepository:
    """
    Repository for session_logs table.
    One row per session; a user may have many sessions.
    """

    @staticmethod
    def _row(row) -> Optional[Dict[str, Any]]:
        """Convert an asyncpg Record to a plain dict (None-safe)."""
        return dict(row) if row else None

    # ------------------------------------------------------------------
    # WRITE
    # ------------------------------------------------------------------

    async def create_session(
        self, user_id: str, active_topic: Optional[str] = None
    ) -> str:
        """
        Open a new session log. Returns the new row id as string.
        Called by the frontend when the learner enters the app/lesson.
        """
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.session_logs (user_id, active_topic)
               VALUES ($1, $2)
               RETURNING id""",
            user_id, active_topic,
        )
        doc_id = str(row["id"])
        logger.info(f"[Session] Started: user={user_id} topic={active_topic} id={doc_id}")
        return doc_id

    async def end_session(
        self,
        session_id: str,
        user_id: Optional[str] = None,
        break_reminder_sent: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """
        Close an open session. Computes duration_seconds server-side.
        Returns the updated row, or None if not found.
        """
        if not session_id:
            logger.warning("[Session] Invalid session_id: empty")
            return None

        query = "id = $1::bigint"
        values: List[Any] = [session_id]
        if user_id:
            query += " AND user_id = $2"
            values.append(user_id)

        now = datetime.utcnow()
        row = await postgres_pool().fetchrow(
            f"""UPDATE public.session_logs
                SET ended_at = $1,
                    duration_seconds = EXTRACT(EPOCH FROM (now() - started_at))::int,
                    break_reminder_sent = $2
                WHERE {query}
                RETURNING *""",
            now, break_reminder_sent, *values,
        )
        if not row:
            return None

        doc = dict(row)
        logger.info(
            f"[Session] Ended: id={session_id} duration={doc.get('duration_seconds')}s "
            f"break_reminder={break_reminder_sent}"
        )
        return doc

    # ------------------------------------------------------------------
    # READ
    # ------------------------------------------------------------------

    async def get_sessions(
        self, user_id: str, days: int = 7, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get recent closed sessions for a user (for Progress Report)."""
        since = datetime.utcnow() - timedelta(days=days)
        rows = await postgres_pool().fetch(
            """SELECT * FROM public.session_logs
               WHERE user_id=$1 AND started_at >= $2 AND ended_at IS NOT NULL
               ORDER BY started_at DESC
               LIMIT $3""",
            user_id, since, limit,
        )
        return [dict(r) for r in rows]

    async def get_summary(self, user_id: str) -> Dict[str, Any]:
        """
        Aggregate session stats for the Progress Report:
        total_sessions, total_time_seconds, average, longest, most_studied_topic.
        """
        row = await postgres_pool().fetchrow(
            """SELECT
                   count(*)::int AS total_sessions,
                   coalesce(sum(duration_seconds), 0)::int AS total_time_seconds,
                   coalesce(avg(duration_seconds), 0)::float AS average_session_seconds,
                   coalesce(max(duration_seconds), 0)::int AS longest_session_seconds
               FROM public.session_logs
               WHERE user_id=$1 AND ended_at IS NOT NULL""",
            user_id,
        )

        # Most studied topic — most frequent active_topic among closed sessions.
        topic_row = await postgres_pool().fetchrow(
            """SELECT active_topic FROM public.session_logs
               WHERE user_id=$1 AND ended_at IS NOT NULL AND active_topic IS NOT NULL
               GROUP BY active_topic
               ORDER BY count(*) DESC
               LIMIT 1""",
            user_id,
        )

        if not row:
            return {
                "user_id": user_id,
                "total_sessions": 0,
                "total_time_seconds": 0,
                "average_session_seconds": 0.0,
                "longest_session_seconds": 0,
                "most_studied_topic": None,
            }

        return {
            "user_id": user_id,
            "total_sessions": row["total_sessions"],
            "total_time_seconds": row["total_time_seconds"],
            "average_session_seconds": round(row["average_session_seconds"], 1),
            "longest_session_seconds": row["longest_session_seconds"],
            "most_studied_topic": topic_row["active_topic"] if topic_row else None,
        }

    async def get_active_session(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Return the most recent unclosed session for a user (if any)."""
        row = await postgres_pool().fetchrow(
            """SELECT * FROM public.session_logs
               WHERE user_id=$1 AND ended_at IS NULL
               ORDER BY started_at DESC
               LIMIT 1""",
            user_id,
        )
        return self._row(row)


def get_session_log_repository() -> SessionLogRepository:
    """Factory function for FastAPI dependency injection."""
    return SessionLogRepository()
