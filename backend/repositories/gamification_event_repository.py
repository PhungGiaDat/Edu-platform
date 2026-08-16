# backend/repositories/gamification_event_repository.py
"""
GamificationEvent Repository - Beanie ODM for XP Event Ledger

Uses Beanie ODM for type-safe document operations on gamification_events collection.
Provides idempotency via UNIQUE(user_id, event_id) index.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging

from models.gamification_event import (
    GamificationEventDocument,
    EventStatus,
)

logger = logging.getLogger(__name__)


class GamificationEventRepository:
    """Repository for gamification events using Beanie ODM."""

    @staticmethod
    async def find_by_user_event(user_id: str, event_id: str) -> Optional[Dict[str, Any]]:
        """
        Find an event by user_id and event_id.
        Returns None if not found.
        """
        event = await GamificationEventDocument.find_one(
            {"user_id": user_id, "event_id": event_id}
        )
        if event:
            return event.model_dump()
        return None

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
        """
        Create a new gamification event.
        Returns None if duplicate key violation (event already exists).
        Raises exception on other errors.
        """
        try:
            event = GamificationEventDocument(
                user_id=user_id,
                event_id=event_id,
                action=action,
                source_type=source_type,
                source_id=source_id,
                attempt_id=attempt_id,
                session_id=session_id,
                learning_path_id=learning_path_id,
                metadata=metadata or {},
                status=EventStatus.PROCESSING,
                created_at=datetime.utcnow(),
            )
            await event.insert()
            logger.info(f"[GamificationEvent] Created event {event_id} for user {user_id}")
            return event.model_dump()
        except Exception as e:
            # Check for duplicate key error
            error_str = str(e).lower()
            if "duplicate" in error_str or "e11000" in error_str:
                logger.info(f"[GamificationEvent] Duplicate event {event_id} for user {user_id}")
                return None
            raise

    @staticmethod
    async def mark_applied(
        user_id: str,
        event_id: str,
        xp_awarded: int,
        total_xp_after: int,
        level_after: int,
        xp_to_next_after: int,
    ) -> Optional[Dict[str, Any]]:
        """
        Mark event as applied with result snapshot.
        
        ATOMICITY FIX: Uses conditional update to ensure idempotent apply.
        Only updates if status is still PROCESSING - prevents duplicate XP.
        
        Returns None if event doesn't exist OR if status was already APPLIED
        (another request won the race).
        """
        from models.gamification_event import GamificationEventDocument, EventStatus
        
        # Atomic conditional update: only succeeds if status is still PROCESSING
        result = await GamificationEventDocument.find_one_and_update(
            {"user_id": user_id, "event_id": event_id, "status": EventStatus.PROCESSING},
            {
                "$set": {
                    "status": EventStatus.APPLIED,
                    "xp_awarded": xp_awarded,
                    "total_xp_after": total_xp_after,
                    "level_after": level_after,
                    "xp_to_next_after": xp_to_next_after,
                    "applied_at": datetime.utcnow(),
                }
            },
            return_document=True,
        )
        
        if result is None:
            # Either event doesn't exist, or status was already updated (race condition)
            # Check current status to determine which
            existing = await GamificationEventDocument.find_one(
                {"user_id": user_id, "event_id": event_id}
            )
            if existing is None:
                logger.warning(f"[GamificationEvent] Event {event_id} not found for user {user_id}")
                return None
            if existing.status == EventStatus.APPLIED:
                logger.info(f"[GamificationEvent] Event {event_id} already APPLIED (race won by another request)")
                return None  # Another request won the race
            if existing.status == EventStatus.REJECTED:
                logger.info(f"[GamificationEvent] Event {event_id} was REJECTED")
                return None
            # Should not reach here normally
            logger.warning(f"[GamificationEvent] Event {event_id} in unexpected state: {existing.status}")
            return None
        
        logger.info(f"[GamificationEvent] Marked event {event_id} as APPLIED (atomic update)")
        return result.model_dump()

    @staticmethod
    async def reset_to_processing(
        user_id: str,
        event_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Reset a REJECTED event back to PROCESSING for retry.
        
        Only works for REJECTED status. Returns None if event doesn't exist
        or is in a different status.
        """
        from models.gamification_event import GamificationEventDocument, EventStatus
        
        result = await GamificationEventDocument.find_one_and_update(
            {"user_id": user_id, "event_id": event_id, "status": EventStatus.REJECTED},
            {
                "$set": {
                    "status": EventStatus.PROCESSING,
                    "applied_at": None,
                    "xp_awarded": 0,
                    "total_xp_after": None,
                    "level_after": None,
                    "xp_to_next_after": None,
                }
            },
            return_document=True,
        )
        
        if result is None:
            return None
        
        logger.info(f"[GamificationEvent] Reset event {event_id} to PROCESSING for retry")
        return result.model_dump()

    @staticmethod
    async def mark_rejected(
        user_id: str,
        event_id: str,
        error_reason: str,
    ) -> Optional[Dict[str, Any]]:
        """Mark event as rejected with error info."""
        event = await GamificationEventDocument.find_one(
            {"user_id": user_id, "event_id": event_id}
        )
        if not event:
            return None

        event.status = EventStatus.REJECTED
        event.metadata = {**event.metadata, "error_reason": error_reason}
        event.applied_at = datetime.utcnow()

        await event.save()
        logger.warning(f"[GamificationEvent] Marked event {event_id} as REJECTED: {error_reason}")
        return event.model_dump()

    @staticmethod
    async def get_user_events(
        user_id: str,
        limit: int = 50,
        skip: int = 0,
    ) -> List[Dict[str, Any]]:
        """Get user's gamification events sorted by creation time."""
        events = await GamificationEventDocument.find(
            {"user_id": user_id}
        ).sort("-created_at").skip(skip).limit(limit).to_list()

        return [e.model_dump() for e in events]

    @staticmethod
    async def get_pending_events(limit: int = 100) -> List[Dict[str, Any]]:
        """Get all processing events for recovery/cleanup."""
        events = await GamificationEventDocument.find(
            {"status": EventStatus.PROCESSING}
        ).limit(limit).to_list()

        return [e.model_dump() for e in events]


def get_gamification_event_repository() -> GamificationEventRepository:
    """Factory function for dependency injection."""
    return GamificationEventRepository()
