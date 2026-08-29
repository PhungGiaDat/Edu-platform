"""Asyncpg persistence for the daily lesson challenge and claim ledger."""

from __future__ import annotations

import json
from datetime import date
from typing import Any, Iterable, Mapping

from settings import settings

PRODUCT_TIMEZONE = settings.DAILY_CHALLENGE_TIMEZONE
DEFAULT_XP_REWARD = 50
DEFAULT_XP_LABEL = "50 XP"


def _as_dict(row: Any) -> dict[str, Any] | None:
    return dict(row) if row is not None else None


class DailyChallengeRepository:
    """Keeps Daily Challenge state in PostgreSQL behind an asyncpg connection."""

    @staticmethod
    async def get_today(connection, challenge_date: date) -> dict[str, Any] | None:
        row = await connection.fetchrow(
            """SELECT *
               FROM public.daily_challenges
               WHERE challenge_date=$1::date AND status='published'""",
            challenge_date,
        )
        return _as_dict(row)

    @staticmethod
    async def ensure_today(
        connection,
        challenge_date: date,
        title: str,
        target_lessons: int,
        lessons: Iterable[Mapping[str, str]],
    ) -> dict[str, Any]:
        """Create the deterministic challenge once, together with its 50-XP definition.

        Lesson membership is selected on the server from published catalog rows.
        ``lessons`` remains in the interface for callers that already construct a
        candidate list, but deliberately is not trusted for authoritative
        membership selection.
        """
        del lessons
        if target_lessons < 1:
            raise ValueError("target_lessons must be positive")

        challenge_id = f"daily:{challenge_date.isoformat()}"
        async with connection.transaction():
            created = await connection.fetchrow(
                """INSERT INTO public.daily_challenges
                       (challenge_id, challenge_date, title, target_lessons, status)
                   VALUES ($1, $2::date, $3, $4, 'published')
                   ON CONFLICT (challenge_date) DO NOTHING
                   RETURNING *""",
                challenge_id,
                challenge_date,
                title,
                target_lessons,
            )
            if created is None:
                existing = await connection.fetchrow(
                    """SELECT * FROM public.daily_challenges
                       WHERE challenge_date=$1::date""",
                    challenge_date,
                )
                result = _as_dict(existing)
                if result is None:
                    raise RuntimeError("daily challenge creation race could not be resolved")
                return result

            selected_lessons = await connection.fetch(
                """SELECT lesson.course_id, lesson.lesson_id
                   FROM public.lessons AS lesson
                   JOIN public.courses AS course ON course.course_id=lesson.course_id
                   WHERE course.is_published=TRUE
                   ORDER BY course.course_id, lesson.lesson_order, lesson.lesson_id
                   LIMIT $1""",
                target_lessons,
            )
            if len(selected_lessons) != target_lessons:
                raise ValueError("not enough published lessons to create a daily challenge")

            for position, lesson in enumerate(selected_lessons, start=1):
                await connection.execute(
                    """INSERT INTO public.daily_challenge_lessons
                           (challenge_id, course_id, lesson_id, position)
                       VALUES ($1, $2, $3, $4)
                       ON CONFLICT (challenge_id, lesson_id) DO NOTHING""",
                    challenge_id,
                    lesson["course_id"],
                    lesson["lesson_id"],
                    position,
                )

            await connection.execute(
                """INSERT INTO public.daily_challenge_rewards
                       (challenge_id, reward_type, xp_amount, display_label)
                   VALUES ($1, 'xp', $2, $3)
                   ON CONFLICT (challenge_id, reward_type) DO NOTHING""",
                challenge_id,
                DEFAULT_XP_REWARD,
                DEFAULT_XP_LABEL,
            )
            return dict(created)

    @staticmethod
    async def get_user_today(connection, user_id: str, challenge_date: date) -> dict[str, Any] | None:
        row = await connection.fetchrow(
            """SELECT challenge.*, claim.status AS claim_status, claim.claimed_at,
                      claim.xp_awarded, claim.badge_id, claim.pet_id, claim.grant_result
               FROM public.daily_challenges AS challenge
               LEFT JOIN public.daily_challenge_claims AS claim
                 ON claim.challenge_id=challenge.challenge_id AND claim.user_id=$1
               WHERE challenge.challenge_date=$2::date AND challenge.status='published'""",
            user_id,
            challenge_date,
        )
        return _as_dict(row)

    @staticmethod
    async def get_completion(
        connection,
        user_id: str,
        challenge_id: str,
        challenge_date: date,
    ) -> dict[str, Any]:
        row = await connection.fetchrow(
            """SELECT challenge.target_lessons AS target,
                      COUNT(DISTINCT progress.lesson_id)::integer AS progress,
                      COALESCE(
                        array_agg(DISTINCT progress.lesson_id)
                          FILTER (WHERE progress.lesson_id IS NOT NULL),
                        ARRAY[]::text[]
                      ) AS completed_lesson_ids
               FROM public.daily_challenges AS challenge
               JOIN public.daily_challenge_lessons AS membership
                 ON membership.challenge_id=challenge.challenge_id
               LEFT JOIN public.user_course_lesson_progress AS progress
                 ON progress.user_id=$1
                AND progress.course_id=membership.course_id
                AND progress.lesson_id=membership.lesson_id
                AND progress.status='completed'
                AND progress.completed_at >= ($3::date::timestamp AT TIME ZONE $4)
                AND progress.completed_at < (($3::date + 1)::timestamp AT TIME ZONE $4)
               WHERE challenge.challenge_id=$2 AND challenge.challenge_date=$3::date
               GROUP BY challenge.target_lessons""",
            user_id,
            challenge_id,
            challenge_date,
            PRODUCT_TIMEZONE,
        )
        return _as_dict(row) or {"progress": 0, "target": 0, "completed_lesson_ids": []}

    @staticmethod
    async def get_rewards(connection, challenge_id: str) -> list[dict[str, Any]]:
        rows = await connection.fetch(
            """SELECT reward_id, reward_type, xp_amount, badge_id, pet_id, display_label
               FROM public.daily_challenge_rewards
               WHERE challenge_id=$1
               ORDER BY reward_type, reward_id""",
            challenge_id,
        )
        return [dict(row) for row in rows]

    @staticmethod
    async def get_claim(connection, user_id: str, challenge_id: str) -> dict[str, Any] | None:
        row = await connection.fetchrow(
            """SELECT * FROM public.daily_challenge_claims
               WHERE user_id=$1 AND challenge_id=$2""",
            user_id,
            challenge_id,
        )
        return _as_dict(row)

    @staticmethod
    async def lock_or_create_claim(
        connection,
        user_id: str,
        challenge_id: str,
        event_id: str,
        progress: int,
    ) -> dict[str, Any]:
        existing = await connection.fetchrow(
            """SELECT * FROM public.daily_challenge_claims
               WHERE user_id=$1 AND challenge_id=$2 FOR UPDATE""",
            user_id,
            challenge_id,
        )
        if existing is not None:
            return dict(existing)

        created = await connection.fetchrow(
            """INSERT INTO public.daily_challenge_claims
                   (user_id, challenge_id, event_id, progress_at_claim, status)
               VALUES ($1, $2, $3, $4, 'processing')
               ON CONFLICT (user_id, challenge_id) DO NOTHING
               RETURNING *""",
            user_id,
            challenge_id,
            event_id,
            progress,
        )
        if created is not None:
            return dict(created)

        raced_claim = await connection.fetchrow(
            """SELECT * FROM public.daily_challenge_claims
               WHERE user_id=$1 AND challenge_id=$2 FOR UPDATE""",
            user_id,
            challenge_id,
        )
        if raced_claim is None:
            raise RuntimeError("daily challenge claim creation race could not be resolved")
        return dict(raced_claim)

    @staticmethod
    async def mark_claim_applied(
        connection,
        user_id: str,
        challenge_id: str,
        outcome: Mapping[str, Any],
    ) -> dict[str, Any]:
        row = await connection.fetchrow(
            """UPDATE public.daily_challenge_claims
               SET status='applied',
                   grant_result=$3::jsonb,
                   xp_awarded=$4,
                   badge_id=$5,
                   pet_id=$6,
                   claimed_at=now(),
                   updated_at=now()
               WHERE user_id=$1 AND challenge_id=$2 AND status='processing'
               RETURNING *""",
            user_id,
            challenge_id,
            json.dumps(dict(outcome)),
            int(outcome.get("xp_awarded", 0)),
            outcome.get("badge_id"),
            outcome.get("pet_id"),
        )
        result = _as_dict(row)
        if result is None:
            raise LookupError("daily challenge claim does not exist")
        return result
