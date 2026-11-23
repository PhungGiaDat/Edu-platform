"""
Reports Repository - Data Access Layer for learning analytics.
All SQL queries for user progress, weekly reports, and achievements.
"""
from typing import Dict, List, Any
from datetime import datetime, timedelta
from database.postgres_connection import postgres_pool


class ReportsRepository:
    """Repository for public.report_* and analytics queries."""

    # ── Word mastery ────────────────────────────────────────────────────────────

    async def get_words_learned_count(self, user_id: str) -> int:
        row = await postgres_pool().fetchval(
            "SELECT count(*)::int FROM public.word_mastery WHERE user_id=$1 AND mastery_level>=3",
            user_id,
        )
        return int(row) if row else 0

    async def get_topic_breakdown(self, user_id: str) -> List[Dict[str, Any]]:
        rows = await postgres_pool().fetch(
            """
            SELECT w.course_id, count(*)::int as words_count
            FROM public.word_mastery w
            WHERE w.user_id=$1 AND w.mastery_level>=3 AND w.course_id IS NOT NULL
            GROUP BY w.course_id
            ORDER BY words_count DESC
            LIMIT 10
            """,
            user_id,
        )
        return [dict(r) for r in rows]

    # ── Quiz / pronunciation ──────────────────────────────────────────────────

    async def get_avg_pronunciation_score(self, user_id: str) -> int:
        row = await postgres_pool().fetchrow(
            "SELECT round(avg(score))::int as avg FROM public.quiz_attempts WHERE user_id=$1 AND score IS NOT NULL",
            user_id,
        )
        return int(row["avg"] or 0) if row else 0

    # ── Session logs ──────────────────────────────────────────────────────────

    async def get_recent_sessions(
        self, user_id: str, days: int
    ) -> List[Dict[str, Any]]:
        cutoff = datetime.utcnow() - timedelta(days=days)
        rows = await postgres_pool().fetch(
            """
            SELECT id, started_at, ended_at, duration_seconds, words_learned, games_played, active_topic
            FROM public.session_logs
            WHERE user_id=$1 AND ended_at IS NOT NULL AND started_at >= $2
            ORDER BY started_at DESC
            LIMIT $3
            """,
            user_id, cutoff, days,
        )
        return [dict(r) for r in rows]

    # ── Daily progress ────────────────────────────────────────────────────────

    async def get_daily_progress(
        self, user_id: str, days: int
    ) -> List[Dict[str, Any]]:
        """
        Returns rows from daily_learning_progress for the last N days.
        """
        rows = await postgres_pool().fetch(
            """
            SELECT progress_date, time_spent_mins, words_learned, games_played, pronunciation_attempts
            FROM public.daily_learning_progress
            WHERE user_id=$1 AND progress_date >= CURRENT_DATE - INTERVAL '1 day' * $2
            ORDER BY progress_date ASC
            """,
            user_id, days,
        )
        return [dict(r) for r in rows]

    # ── Quiz attempts ─────────────────────────────────────────────────────────

    async def get_quiz_summary(self, user_id: str) -> Dict[str, Any]:
        row = await postgres_pool().fetchrow(
            """
            SELECT count(*)::int as total, round(avg(score))::int as avg_score
            FROM public.quiz_attempts WHERE user_id=$1 AND score IS NOT NULL
            """,
            user_id,
        )
        return {
            "total_attempts": int(row["total"] or 0) if row else 0,
            "avg_score": int(row["avg_score"] or 0) if row else 0,
        }


def get_reports_repository() -> ReportsRepository:
    return ReportsRepository()
