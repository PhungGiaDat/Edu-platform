"""Pronunciation course repository — Supabase PostgreSQL only.

Replaces the MongoDB-based pronunciation_course module.
All tables are in public.* schema on Supabase.
"""
from __future__ import annotations

from datetime import datetime, date, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from database.postgres_connection import postgres_pool


class PronunciationCourseRepository:
    """CRUD for pronunciation_topics, pronunciation_words."""

    async def list_active_topics(self) -> List[Dict[str, Any]]:
        rows = await postgres_pool().fetch(
            """SELECT topic_id, name, name_vi, icon, color, display_order
               FROM public.pronunciation_topics
               WHERE is_active = TRUE
               ORDER BY display_order ASC""",
        )
        return [dict(r) for r in rows]

    async def get_topic(self, topic_id: str) -> Optional[Dict[str, Any]]:
        row = await postgres_pool().fetchrow(
            """SELECT topic_id, name, name_vi, icon, color, display_order
               FROM public.pronunciation_topics
               WHERE topic_id = $1 AND is_active = TRUE""",
            topic_id,
        )
        return dict(row) if row else None

    async def list_words(self, topic_id: str) -> List[Dict[str, Any]]:
        rows = await postgres_pool().fetch(
            """SELECT word_id, topic_id, word, phonetic, difficulty, audio_url, display_order
               FROM public.pronunciation_words
               WHERE topic_id = $1
               ORDER BY display_order ASC""",
            topic_id,
        )
        return [dict(r) for r in rows]


class PronunciationAttemptRepository:
    """Log pronunciation attempts and compute per-user progress."""

    async def log_attempt(
        self,
        user_id: str,
        topic_id: str,
        word_id: str,
        score: int,
        stars: int,
        transcription: Optional[str] = None,
        evaluation_method: str = "browser",
        session_id: Optional[str] = None,
        device_info: Optional[Dict[str, Any]] = None,
        client_timestamp: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        attempt_id = uuid4().hex
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.pronunciation_attempts
               (attempt_id, user_id, topic_id, word_id, score, stars,
                transcription, evaluation_method, session_id, device_info, client_timestamp)
               VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
               RETURNING *""",
            attempt_id,
            user_id,
            topic_id,
            word_id,
            score,
            stars,
            transcription,
            evaluation_method,
            session_id,
            device_info or {},
            client_timestamp,
        )
        return dict(row)

    async def get_best_stars(self, user_id: str, word_id: str) -> int:
        val = await postgres_pool().fetchval(
            """SELECT MAX(stars)
               FROM public.pronunciation_attempts
               WHERE user_id=$1 AND word_id=$2""",
            user_id, word_id,
        )
        return val or 0

    async def get_topic_progress(
        self, user_id: str, topic_id: str, word_ids: List[str]
    ) -> Dict[str, int]:
        """Return {word_id: best_stars} for each word in topic."""
        if not word_ids:
            return {}
        rows = await postgres_pool().fetch(
            """SELECT word_id, MAX(stars) AS best_stars
               FROM public.pronunciation_attempts
               WHERE user_id=$1 AND topic_id=$2 AND word_id = ANY($3::text[])
               GROUP BY word_id""",
            user_id, topic_id, word_ids,
        )
        return {r["word_id"]: int(r["best_stars"]) for r in rows}

    async def get_total_progress(self, user_id: str) -> Dict[str, Any]:
        """Aggregate all-time stats for a user."""
        row = await postgres_pool().fetchrow(
            """SELECT
                   COUNT(*)                                     AS total_attempts,
                   COUNT(DISTINCT word_id)                     AS words_practiced,
                   SUM(stars)                                   AS total_stars,
                   COUNT(DISTINCT topic_id)                     AS topics_started
               FROM public.pronunciation_attempts
               WHERE user_id=$1""",
            user_id,
        )
        return dict(row) if row else {}

    async def get_words_per_topic(self, user_id: str) -> List[Dict[str, Any]]:
        rows = await postgres_pool().fetch(
            """SELECT
                   t.topic_id,
                   t.name_vi                              AS topic_name,
                   COUNT(DISTINCT a.word_id)              AS words_learned,
                   SUM(a.stars)                           AS topic_stars,
                   COUNT(DISTINCT w.word_id)              AS total_words
               FROM public.pronunciation_topics t
               LEFT JOIN public.pronunciation_words w
                   ON w.topic_id = t.topic_id
               LEFT JOIN LATERAL (
                   SELECT word_id, stars
                   FROM public.pronunciation_attempts a
                   WHERE a.user_id = $1
                     AND a.topic_id = t.topic_id
                     AND a.stars >= 1
               ) a ON TRUE
               WHERE t.is_active = TRUE
               GROUP BY t.topic_id, t.name_vi, t.display_order
               ORDER BY t.display_order""",
            user_id,
        )
        return [dict(r) for r in rows]

    async def get_favorite_topic(self, user_id: str) -> Optional[Dict[str, Any]]:
        row = await postgres_pool().fetchrow(
            """SELECT
                   t.topic_id,
                   t.name_vi                              AS topic_name,
                   COUNT(DISTINCT a.word_id)               AS words_learned
               FROM public.pronunciation_topics t
               LEFT JOIN public.pronunciation_attempts a
                   ON a.user_id = $1 AND a.topic_id = t.topic_id AND a.stars >= 1
               WHERE t.is_active = TRUE
               GROUP BY t.topic_id, t.name_vi
               ORDER BY COUNT(DISTINCT a.word_id) DESC
               LIMIT 1""",
            user_id,
        )
        return dict(row) if row else None

    async def get_streak(self, user_id: str) -> int:
        """Count consecutive days with at least one attempt ending today/yesterday."""
        rows = await postgres_pool().fetch(
            """SELECT DISTINCT
                   DATE(created_at AT TIME ZONE 'UTC') AS day
               FROM public.pronunciation_attempts
               WHERE user_id = $1
               ORDER BY day DESC
               LIMIT 30""",
            user_id,
        )
        if not rows:
            return 0

        today = date.today()
        streak = 0
        prev: Optional[date] = None

        for r in rows:
            d: date = r["day"]
            if prev is None:
                if (today - d).days > 1:
                    return 0
                streak = 1
            elif (prev - d).days == 1:
                streak += 1
            else:
                break
            prev = d

        return streak


class PronunciationRecordingRepository:
    """Store audio recordings for fine-tuning dataset."""

    async def store_recording(
        self,
        user_id: str,
        topic_id: str,
        word_id: str,
        audio_url: str,
        transcription: Optional[str] = None,
        audio_duration_ms: Optional[int] = None,
        is_consent_granted: bool = False,
    ) -> str:
        recording_id = uuid4().hex
        await postgres_pool().execute(
            """INSERT INTO public.pronunciation_recordings
               (recording_id, user_id, topic_id, word_id, audio_url,
                transcription, audio_duration_ms, is_consent_granted)
               VALUES($1,$2,$3,$4,$5,$6,$7,$8)""",
            recording_id, user_id, topic_id, word_id,
            audio_url, transcription, audio_duration_ms, is_consent_granted,
        )
        return recording_id

    async def get_consented_recordings(
        self, limit: int = 100, skip_reviewed: bool = True
    ) -> List[Dict[str, Any]]:
        where = "WHERE is_consent_granted = TRUE"
        if skip_reviewed:
            where += " AND reviewed = FALSE"
        rows = await postgres_pool().fetch(
            f"""SELECT r.*
                FROM public.pronunciation_recordings r
                {where}
                ORDER BY r.created_at DESC
                LIMIT $1""",
            limit,
        )
        return [dict(r) for r in rows]

    async def mark_reviewed(self, recording_id: str, quality_rating: int) -> None:
        await postgres_pool().execute(
            """UPDATE public.pronunciation_recordings
               SET reviewed = TRUE, quality_rating = $2
               WHERE recording_id = $1""",
            recording_id, quality_rating,
        )


# Singleton accessors (same pattern as other repositories)
_repo: Optional[PronunciationCourseRepository] = None
_attempt_repo: Optional[PronunciationAttemptRepository] = None
_recording_repo: Optional[PronunciationRecordingRepository] = None


def get_pronunciation_course_repository() -> PronunciationCourseRepository:
    global _repo
    if _repo is None:
        _repo = PronunciationCourseRepository()
    return _repo


def get_pronunciation_attempt_repository() -> PronunciationAttemptRepository:
    global _attempt_repo
    if _attempt_repo is None:
        _attempt_repo = PronunciationAttemptRepository()
    return _attempt_repo


def get_pronunciation_recording_repository() -> PronunciationRecordingRepository:
    global _recording_repo
    if _recording_repo is None:
        _recording_repo = PronunciationRecordingRepository()
    return _recording_repo
