# backend/repositories/learning_progress_repository.py
"""
Learning Progress Repository - Data Access Layer for learning_progress table

De-Mongo Wave 3: PostgreSQL is the sole persistence path.  The
``postgres_core_enabled()`` runtime gate has been removed; there is no Mongo
fallback in this repository anymore.

The ``learning_progress`` table stores per-user, per-flashcard mastery and
spaced-repetition data.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from database.postgres_connection import postgres_pool
import logging
import json

logger = logging.getLogger(__name__)


class LearningProgressRepository:
    """
    Repository for learning_progress table.
    Tracks per-user, per-flashcard mastery and spaced repetition data.
    """

    # ------------------------------------------------------------------
    # READ
    # ------------------------------------------------------------------

    async def get_by_user_and_card(
        self, user_id: str, flashcard_qr_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get progress record for a specific (user, flashcard) pair."""
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.learning_progress WHERE user_id=$1 AND flashcard_qr_id=$2",
            user_id, flashcard_qr_id,
        )
        return dict(row) if row else None

    async def get_all_for_user(
        self, user_id: str, skip: int = 0, limit: int = 200
    ) -> List[Dict[str, Any]]:
        """Get all progress records for a user (for progress dashboard)."""
        rows = await postgres_pool().fetch(
            "SELECT * FROM public.learning_progress WHERE user_id=$1 ORDER BY last_reviewed_at DESC NULLS LAST OFFSET $2 LIMIT $3",
            user_id, skip, limit,
        )
        return [dict(row) for row in rows]

    async def get_due_for_review(
        self, user_id: str, limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get flashcards whose next_review_at is in the past (spaced repetition)."""
        now = datetime.utcnow()
        rows = await postgres_pool().fetch(
            "SELECT * FROM public.learning_progress WHERE user_id=$1 AND next_review_at <= $2 ORDER BY next_review_at ASC NULLS FIRST LIMIT $3",
            user_id, now, limit,
        )
        return [dict(row) for row in rows]

    async def get_mastered_by_category(
        self, user_id: str, mastery_threshold: int = 4
    ) -> Dict[str, int]:
        """
        Return {category: mastered_count} for use in the Progress Report.
        Joins with flashcards table to get the category.
        """
        rows = await postgres_pool().fetch(
            """SELECT f.category, count(*)::int AS cnt
               FROM public.learning_progress lp
               JOIN public.flashcards f ON f.qr_id = lp.flashcard_qr_id
               WHERE lp.user_id=$1 AND lp.mastery_level >= $2
               GROUP BY f.category
               ORDER BY f.category""",
            user_id, mastery_threshold,
        )
        return {row["category"] or "unknown": row["cnt"] for row in rows}

    # ------------------------------------------------------------------
    # WRITE
    # ------------------------------------------------------------------

    async def upsert_progress(
        self,
        user_id: str,
        flashcard_qr_id: str,
        *,
        viewed: bool = False,
        correct: bool = False,
        incorrect: bool = False,
        mastery_delta: int = 0,
        next_review_at: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Upsert a progress record. Increments counters and optionally updates
        mastery_level and spaced-repetition timestamps.
        """
        now = datetime.utcnow()

        # Build the incremental update SQL dynamically
        set_clauses = ["last_reviewed_at = $3"]
        set_values: list[Any] = [user_id, flashcard_qr_id, now]
        idx = 4

        if viewed:
            set_clauses.append("times_viewed = COALESCE(learning_progress.times_viewed, 0) + 1")
        if correct:
            set_clauses.append("times_correct = COALESCE(learning_progress.times_correct, 0) + 1")
        if incorrect:
            set_clauses.append("times_incorrect = COALESCE(learning_progress.times_incorrect, 0) + 1")
        if mastery_delta != 0:
            set_clauses.append(
                f"mastery_level = GREATEST(0, LEAST(5, COALESCE(learning_progress.mastery_level, 0) + ${idx}))"
            )
            idx += 1
            set_values.append(mastery_delta)
        if next_review_at:
            set_clauses.append(f"next_review_at = ${idx}")
            idx += 1
            set_values.append(next_review_at)

        set_sql = ", ".join(set_clauses)

        # INSERT with ON CONFLICT DO UPDATE
        row = await postgres_pool().fetchrow(
            f"""INSERT INTO public.learning_progress (user_id, flashcard_qr_id, first_seen_at, mastery_level)
                VALUES ($1, $2, $3, 0)
                ON CONFLICT (user_id, flashcard_qr_id)
                DO UPDATE SET {set_sql}
                RETURNING *""",
            *set_values,
        )
        return dict(row) if row else {}

    async def set_mastery_level(
        self, user_id: str, flashcard_qr_id: str, level: int
    ) -> bool:
        """Directly set mastery_level (0–5). Used by quiz grading service."""
        level = max(0, min(5, level))
        row = await postgres_pool().fetchrow(
            "UPDATE public.learning_progress SET mastery_level=$1 WHERE user_id=$2 AND flashcard_qr_id=$3 RETURNING id",
            level, user_id, flashcard_qr_id,
        )
        return row is not None

    async def count_mastered(self, user_id: str, threshold: int = 4) -> int:
        """Count how many flashcards a user has mastered."""
        row = await postgres_pool().fetchrow(
            "SELECT count(*)::int AS cnt FROM public.learning_progress WHERE user_id=$1 AND mastery_level >= $2",
            user_id, threshold,
        )
        return int(row["cnt"]) if row else 0


def get_learning_progress_repository() -> LearningProgressRepository:
    """Factory function for FastAPI dependency injection."""
    return LearningProgressRepository()