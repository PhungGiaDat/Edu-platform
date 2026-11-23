# backend/repositories/session_tracking_repository.py
"""
Session Tracking Repository - Data Access Layer for active_sessions and session_activities

De-Mongo Wave 4: PostgreSQL is the sole persistence path.  The Mongo fallback
(BaseRepository / _SafeCollection / _SafeCursor) has been removed; there is no
runtime gate anymore.  The ``active_sessions`` and ``session_activities`` tables
are created by database/postgres/migrations/20260901_01_session_tracking.sql.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from database.postgres_connection import postgres_pool
import logging
import json

logger = logging.getLogger(__name__)


class SessionTrackingRepository:
    """
    Repository for active_sessions table.
    Handles session heartbeat, status tracking, and app locking.
    """

    @staticmethod
    def _row(row) -> Optional[Dict[str, Any]]:
        """Convert an asyncpg Record to a plain dict (None-safe)."""
        return dict(row) if row else None

    # ------------------------------------------------------------------
    # SESSION MANAGEMENT
    # ------------------------------------------------------------------

    async def create_or_update_session(
        self,
        user_id: str,
        session_id: str
    ) -> str:
        """Create or update an active session.

        Ends any other live session for the user, then upserts the target
        session (ON CONFLICT on the primary key session_id).
        """
        now = datetime.utcnow()

        # End other live sessions for this user.
        await postgres_pool().execute(
            """UPDATE public.active_sessions
               SET status='ended', ended_at=$2, updated_at=$2
               WHERE user_id=$1 AND status <> 'ended'""",
            user_id, now,
        )

        # Upsert the target session.
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.active_sessions
                   (session_id, user_id, status, started_at, last_heartbeat,
                    last_activity_at, current_step_id, current_step_index,
                    progress_percent, is_locked, locked_at, locked_until,
                    locked_reason, idle_seconds)
               VALUES ($1, $2, 'active', $3, $3, $3, NULL, 0, 0, FALSE, NULL, NULL, NULL, 0)
               ON CONFLICT (session_id) DO UPDATE SET
                   user_id = EXCLUDED.user_id,
                   status = 'active',
                   last_heartbeat = $3,
                   last_activity_at = $3,
                   idle_seconds = 0,
                   ended_at = NULL,
                   updated_at = $3
               RETURNING session_id""",
            session_id, user_id, now,
        )

        if row:
            logger.info(f"[SessionTracking] Created/updated session: {session_id}")
        else:
            logger.debug(f"[SessionTracking] No-op session update: {session_id}")

        return session_id

    async def heartbeat(
        self,
        session_id: str,
        user_id: str,
        current_step_id: Optional[str] = None,
        current_step_index: Optional[int] = None,
        progress_percent: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """Update session heartbeat and return updated session."""
        now = datetime.utcnow()

        update_data: Dict[str, Any] = {
            "last_heartbeat": now,
            "last_activity_at": now,
            "idle_seconds": 0,
            "status": "active",
        }

        if current_step_id is not None:
            update_data["current_step_id"] = current_step_id
        if current_step_index is not None:
            update_data["current_step_index"] = current_step_index
        if progress_percent is not None:
            update_data["progress_percent"] = progress_percent

        set_clauses = []
        values: List[Any] = []
        for key, value in update_data.items():
            set_clauses.append(f"{key} = ${len(values) + 2}")
            values.append(value)

        row = await postgres_pool().fetchrow(
            f"""UPDATE public.active_sessions
                SET {', '.join(set_clauses)}
                WHERE session_id=$1 AND user_id=$2
                RETURNING *""",
            session_id, user_id, *values,
        )

        return self._row(row)

    async def get_active_session(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get the current active session for a user."""
        row = await postgres_pool().fetchrow(
            """SELECT * FROM public.active_sessions
               WHERE user_id=$1 AND status IN ('active', 'idle', 'locked')
               ORDER BY started_at DESC
               LIMIT 1""",
            user_id,
        )
        return self._row(row)

    async def get_session_by_id(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get a session by its ID."""
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.active_sessions WHERE session_id=$1",
            session_id,
        )
        return self._row(row)

    async def end_session(self, session_id: str, user_id: str) -> bool:
        """End a session."""
        now = datetime.utcnow()
        row = await postgres_pool().fetchrow(
            """UPDATE public.active_sessions
               SET status='ended', ended_at=$3, updated_at=$3
               WHERE session_id=$1 AND user_id=$2
               RETURNING session_id""",
            session_id, user_id, now,
        )
        return row is not None

    # ------------------------------------------------------------------
    # APP LOCK
    # ------------------------------------------------------------------

    async def lock_app(
        self,
        session_id: str,
        user_id: str,
        reason: Optional[str] = None,
        duration_minutes: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """Lock the app for a session."""
        now = datetime.utcnow()
        locked_until = None
        if duration_minutes:
            locked_until = now + timedelta(minutes=duration_minutes)

        row = await postgres_pool().fetchrow(
            """UPDATE public.active_sessions
               SET status='locked', is_locked=TRUE, locked_at=$3, locked_until=$4,
                   locked_reason=$5, updated_at=$3
               WHERE session_id=$1 AND user_id=$2
               RETURNING *""",
            session_id, user_id, now, locked_until, reason,
        )

        doc = self._row(row)
        if doc:
            logger.info(f"[SessionTracking] App locked: session={session_id} reason={reason}")
        return doc

    async def unlock_app(self, session_id: str, user_id: str) -> bool:
        """Unlock the app for a session."""
        now = datetime.utcnow()
        row = await postgres_pool().fetchrow(
            """UPDATE public.active_sessions
               SET status='active', is_locked=FALSE, locked_at=NULL, locked_until=NULL,
                   locked_reason=NULL, updated_at=$3
               WHERE session_id=$1 AND user_id=$2
               RETURNING session_id""",
            session_id, user_id, now,
        )
        return row is not None

    # ------------------------------------------------------------------
    # IDLE DETECTION
    # ------------------------------------------------------------------

    async def mark_idle(self, session_id: str, user_id: str) -> bool:
        """Mark a session as idle (no heartbeat received)."""
        now = datetime.utcnow()
        row = await postgres_pool().fetchrow(
            """UPDATE public.active_sessions
               SET status='idle', updated_at=$3
               WHERE session_id=$1 AND user_id=$2 AND status='active'
               RETURNING session_id""",
            session_id, user_id, now,
        )
        return row is not None

    async def cleanup_stale_sessions(self, idle_threshold_seconds: int = 300) -> int:
        """Mark stale sessions as idle."""
        threshold = datetime.utcnow() - timedelta(seconds=idle_threshold_seconds)

        rows = await postgres_pool().fetch(
            """UPDATE public.active_sessions
               SET status='idle', idle_seconds=$2, updated_at=$3
               WHERE status='active' AND last_heartbeat < $1
               RETURNING session_id""",
            threshold, int(idle_threshold_seconds), datetime.utcnow(),
        )

        count = len(rows)
        if count:
            logger.info(f"[SessionTracking] Marked {count} sessions as idle")
        return count

    # ------------------------------------------------------------------
    # ACTIVITY LOGGING
    # ------------------------------------------------------------------

    async def log_activity(
        self,
        session_id: str,
        user_id: str,
        activity_type: str,
        activity_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """Log an activity event for analytics."""
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.session_activities
                   (session_id, user_id, activity_type, activity_data)
               VALUES ($1, $2, $3, $4::jsonb)
               RETURNING id""",
            session_id, user_id, activity_type,
            json.dumps(activity_data or {}, default=str),
        )
        return str(row["id"]) if row else ""

    async def get_session_activities(
        self,
        session_id: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get activity log for a session."""
        rows = await postgres_pool().fetch(
            """SELECT id, session_id, user_id, activity_type, activity_data, timestamp
               FROM public.session_activities
               WHERE session_id=$1
               ORDER BY timestamp DESC
               LIMIT $2""",
            session_id, limit,
        )
        return [dict(r) for r in rows]

    # ------------------------------------------------------------------
    # METRICS
    # ------------------------------------------------------------------

    async def get_user_metrics(self, user_id: str) -> Dict[str, Any]:
        """Get aggregated session metrics for a user."""
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = today - timedelta(days=7)

        # Total sessions and time (status='ended' rows)
        total_row = await postgres_pool().fetchrow(
            """SELECT
                   count(*)::int AS total_sessions,
                   coalesce(sum(EXTRACT(EPOCH FROM (ended_at - started_at)))::int, 0) AS total_time_seconds
               FROM public.active_sessions
               WHERE user_id=$1 AND status='ended'""",
            user_id,
        )
        totals = dict(total_row) if total_row else {"total_sessions": 0, "total_time_seconds": 0}

        # Today's stats
        today_row = await postgres_pool().fetchrow(
            """SELECT
                   count(*)::int AS sessions_today,
                   coalesce(sum(EXTRACT(EPOCH FROM (ended_at - started_at)))::int, 0) AS time_today
               FROM public.active_sessions
               WHERE user_id=$1 AND status='ended' AND started_at >= $2""",
            user_id, today,
        )
        today_stats = dict(today_row) if today_row else {"sessions_today": 0, "time_today": 0}

        return {
            "user_id": user_id,
            "total_sessions": totals.get("total_sessions", 0),
            "total_time_seconds": totals.get("total_time_seconds", 0),
            "average_session_seconds": (
                totals.get("total_time_seconds", 0) / totals.get("total_sessions", 1)
                if totals.get("total_sessions", 0) > 0 else 0
            ),
            "sessions_today": today_stats.get("sessions_today", 0),
            "time_today_seconds": today_stats.get("time_today", 0),
        }


def get_session_tracking_repository() -> SessionTrackingRepository:
    """Factory function for FastAPI dependency injection."""
    return SessionTrackingRepository()
