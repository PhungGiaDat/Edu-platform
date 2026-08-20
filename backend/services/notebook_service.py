# backend/services/notebook_service.py
"""
Notebook Service - Business logic for Sổ tay
"""
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime
import logging

from repositories.notebook_repository import NotebookRepository

logger = logging.getLogger(__name__)


class NotebookService:
    """Service for notebook entry operations"""

    def __init__(self, repository: NotebookRepository):
        self.repository = repository

    async def create_entry(
        self,
        user_id: UUID,
        word: str,
        translation_vi: str,
        translation_en: Optional[str] = None,
        context: Optional[str] = None,
        source: str = "manual",
        topic: Optional[str] = None,
        difficulty: Optional[str] = None,
    ) -> dict:
        """Create a new notebook entry"""
        logger.info(f"[NotebookService] Creating entry for user {user_id}: {word}")

        entry = await self.repository.create(
            user_id=user_id,
            word=word.strip(),
            translation_vi=translation_vi.strip(),
            translation_en=translation_en.strip() if translation_en else None,
            context=context.strip() if context else None,
            source=source,
            topic=topic,
            difficulty=difficulty,
        )

        if entry:
            logger.info(f"[NotebookService] Entry created: {entry['id']}")

        return entry

    async def get_entry(self, entry_id: UUID, user_id: UUID) -> Optional[dict]:
        """Get a single entry"""
        return await self.repository.get_by_id(entry_id, user_id)

    async def list_entries(
        self,
        user_id: UUID,
        topic: Optional[str] = None,
        difficulty: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        per_page: int = 20,
    ) -> Tuple[List[dict], int, int]:
        """
        List entries with pagination.
        Returns: (items, total, total_pages)
        """
        items, total = await self.repository.list_by_user(
            user_id=user_id,
            topic=topic,
            difficulty=difficulty,
            search=search,
            page=page,
            per_page=per_page,
        )
        total_pages = (total + per_page - 1) // per_page
        return items, total, total_pages

    async def update_entry(
        self,
        entry_id: UUID,
        user_id: UUID,
        **fields,
    ) -> Optional[dict]:
        """Update entry fields"""
        # Strip string fields
        for key in ['word', 'translation_vi', 'translation_en', 'context']:
            if key in fields and fields[key]:
                fields[key] = fields[key].strip()

        return await self.repository.update(entry_id, user_id, **fields)

    async def delete_entry(self, entry_id: UUID, user_id: UUID) -> bool:
        """Delete entry"""
        return await self.repository.delete(entry_id, user_id)

    async def get_due_cards(self, user_id: UUID, limit: int = 20) -> List[dict]:
        """Get cards due for review"""
        return await self.repository.get_due_cards(user_id, limit)

    async def submit_review(
        self,
        entry_id: UUID,
        user_id: UUID,
        quality: int,
    ) -> Optional[dict]:
        """
        Submit a review and update SM-2 values.

        Quality ratings:
        - 0: Complete blackout
        - 1: Incorrect, but remembered upon seeing answer
        - 2: Incorrect, but answer seemed easy to recall
        - 3: Correct with serious difficulty
        - 4: Correct with some hesitation
        - 5: Perfect response
        """
        logger.info(f"[NotebookService] Review: entry={entry_id}, quality={quality}")

        entry = await self.repository.submit_review(entry_id, user_id, quality)

        if entry:
            logger.info(
                f"[NotebookService] Updated: ease_factor={entry['ease_factor']}, "
                f"interval={entry['interval_days']} days"
            )

        return entry
