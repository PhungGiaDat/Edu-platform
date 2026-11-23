# backend/repositories/gamification_event_repository.py
"""
GamificationEvent Repository - PostgreSQL only

Idempotent XP event ledger. Uses PostgresGamificationService for transactional
exactly-once semantics. Beanie ODM has been removed.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import json
import logging

from database.postgres_connection import postgres_pool

logger = logging.getLogger(__name__)


class GamificationEventRepository:
    """Repository for gamification events using PostgreSQL."""

    @staticmethod
    async def find_by_user_event(user_id: str, event_id: str) -> Optional[Dict[str, Any]]:
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.gamification_events WHERE user_id=$1 AND event_id=$2",
            user_id, event_id,
        )
        return dict(row) if row else None

    @staticmethod
    async def create_event(
        user_id: str,
        event_id: str,
        action: str,
        source_type: Optional[str] = None,
        source_id: Optional[str] = None,
        attempt_id: Optional[str] = None,
        session_id: Optional[str] = None,
        learning_path_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.gamification_events
               (user_id, event_id, action, source_type, source_id, attempt_id, session_id, learning_path_id, metadata, status, created_at)
               VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'processing',$10)
               ON CONFLICT(user_id, event_id) DO NOTHING RETURNING *""",
            user_id, event_id, action, source_type, source_id, attempt_id,
            session_id, learning_path_id, json.dumps(metadata or {}), datetime.utcnow(),
        )
        if row:
            logger.info(f"[GamificationEvent] Created event {event_id} for user {user_id}")
            return dict(row)
        logger.info(f"[GamificationEvent] Duplicate event {event_id} for user {user_id}")
        return None

    @staticmethod
    async def mark_applied(
        user_id: str,
        event_id: str,
        xp_awarded: int,
        total_xp_after: int,
        level_after: int,
        xp_to_next_after: int,
    ) -> Optional[Dict[str, Any]]:
        row = await postgres_pool().fetchrow(
            """UPDATE public.gamification_events
               SET status='applied', xp_awarded=$3, total_xp_after=$4,
                   level_after=$5, xp_to_next_after=$6, applied_at=$7
               WHERE user_id=$1 AND event_id=$2 AND status='processing'
               RETURNING *""",
            user_id, event_id, xp_awarded, total_xp_after, level_after, xp_to_next_after, datetime.utcnow(),
        )
        if row:
            logger.info(f"[GamificationEvent] Marked event {event_id} as APPLIED")
            return dict(row)

        existing = await postgres_pool().fetchrow(
            "SELECT * FROM public.gamification_events WHERE user_id=$1 AND event_id=$2",
            user_id, event_id,
        )
        if existing is None:
            logger.warning(f"[GamificationEvent] Event {event_id} not found for user {user_id}")
            return None
        logger.info(f"[GamificationEvent] Event {event_id} already in status: {existing['status']}")
        return None

    @staticmethod
    async def reset_to_processing(user_id: str, event_id: str) -> Optional[Dict[str, Any]]:
        row = await postgres_pool().fetchrow(
            """UPDATE public.gamification_events
               SET status='processing', applied_at=NULL, xp_awarded=0,
                   total_xp_after=NULL, level_after=NULL, xp_to_next_after=NULL
               WHERE user_id=$1 AND event_id=$2 AND status='rejected'
               RETURNING *""",
            user_id, event_id,
        )
        if row:
            logger.info(f"[GamificationEvent] Reset event {event_id} to PROCESSING")
        return dict(row) if row else None

    @staticmethod
    async def mark_rejected(user_id: str, event_id: str, error_reason: str) -> Optional[Dict[str, Any]]:
        row = await postgres_pool().fetchrow(
            """UPDATE public.gamification_events
               SET status='rejected', applied_at=$3,
                   metadata=jsonb_set(metadata, '{error_reason}', $4::jsonb)
               WHERE user_id=$1 AND event_id=$2
               RETURNING *""",
            user_id, event_id, datetime.utcnow(), json.dumps(error_reason),
        )
        if row:
            logger.warning(f"[GamificationEvent] Marked event {event_id} as REJECTED: {error_reason}")
            return dict(row)
        return None

    @staticmethod
    async def get_user_events(user_id: str, limit: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
        rows = await postgres_pool().fetch(
            """SELECT * FROM public.gamification_events
               WHERE user_id=$1
               ORDER BY created_at DESC
               LIMIT $2 OFFSET $3""",
            user_id, limit, skip,
        )
        return [dict(row) for row in rows]

    @staticmethod
    async def get_pending_events(limit: int = 100) -> List[Dict[str, Any]]:
        rows = await postgres_pool().fetch(
            """SELECT * FROM public.gamification_events
               WHERE status='processing'
               LIMIT $1""",
            limit,
        )
        return [dict(row) for row in rows]


def get_gamification_event_repository() -> GamificationEventRepository:
    return GamificationEventRepository()
