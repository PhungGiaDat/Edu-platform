# backend/services/notebook_service.py
"""
Notebook Service - Business logic for Sổ tay
"""

from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime
import logging

from repositories.notebook_repository import NotebookRepository
from services.content_safety_service import assert_safe
from sqlalchemy.exc import IntegrityError

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
        pronunciation: Optional[str] = None,
        part_of_speech: Optional[str] = None,
        definition_en: Optional[str] = None,
        wiki_summary: Optional[str] = None,
        explanation_vi: Optional[str] = None,
    ) -> dict:
        """Create a new notebook entry"""
        logger.info(f"[NotebookService] Creating entry for user {user_id}: {word}")

        assert_safe(word, field="word")
        assert_safe(translation_vi, field="translation_vi")
        for optional, name in (
            (translation_en, "translation_en"),
            (context, "context"),
            (pronunciation, "pronunciation"),
            (part_of_speech, "part_of_speech"),
            (definition_en, "definition_en"),
            (wiki_summary, "wiki_summary"),
            (explanation_vi, "explanation_vi"),
        ):
            if optional:
                assert_safe(optional, field=name)

        entry = await self.repository.create(
            user_id=user_id,
            word=word.strip(),
            translation_vi=translation_vi.strip(),
            translation_en=translation_en.strip() if translation_en else None,
            context=context.strip() if context else None,
            source=source,
            topic=topic,
            difficulty=difficulty,
            pronunciation=pronunciation,
            part_of_speech=part_of_speech,
            definition_en=definition_en,
            wiki_summary=wiki_summary,
            explanation_vi=explanation_vi,
        )

        if entry:
            logger.info(f"[NotebookService] Entry created: {entry['id']}")

        return entry

    async def get_or_create_entry(
        self,
        user_id: UUID,
        word: str,
        translation_vi: str,
        translation_en: Optional[str] = None,
        context: Optional[str] = None,
        source: str = "manual",
        topic: Optional[str] = None,
        difficulty: Optional[str] = None,
        pronunciation: Optional[str] = None,
        part_of_speech: Optional[str] = None,
        definition_en: Optional[str] = None,
        wiki_summary: Optional[str] = None,
        explanation_vi: Optional[str] = None,
    ) -> Tuple[dict, bool]:
        """Idempotent save: returns (entry, created). Duplicate word -> existing."""
        assert_safe(word, field="word")
        assert_safe(translation_vi, field="translation_vi")
        for optional, name in (
            (translation_en, "translation_en"),
            (context, "context"),
            (pronunciation, "pronunciation"),
            (part_of_speech, "part_of_speech"),
            (definition_en, "definition_en"),
            (wiki_summary, "wiki_summary"),
            (explanation_vi, "explanation_vi"),
        ):
            if optional:
                assert_safe(optional, field=name)
        existing = await self.repository.get_by_word(user_id, word)
        if existing:
            return existing, False
        try:
            entry = await self.repository.create(
                user_id=user_id,
                word=word.strip(),
                translation_vi=translation_vi.strip(),
                translation_en=translation_en,
                context=context,
                source=source,
                topic=topic,
                difficulty=difficulty,
                pronunciation=pronunciation,
                part_of_speech=part_of_speech,
                definition_en=definition_en,
                wiki_summary=wiki_summary,
                explanation_vi=explanation_vi,
            )
        except IntegrityError:
            # A concurrent save of the same (user_id, word) beat us to the
            # insert. Refetch the winner and report it as NOT created; if it
            # somehow vanished, surface the original error.
            existing = await self.repository.get_by_word(user_id, word)
            if existing:
                return existing, False
            raise
        return entry, entry is not None

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
        # Safety gate on text fields
        for key in (
            "word",
            "translation_vi",
            "translation_en",
            "context",
            "pronunciation",
            "part_of_speech",
            "definition_en",
            "wiki_summary",
        ):
            if key in fields and fields[key]:
                assert_safe(str(fields[key]), field=key)

        # Strip string fields
        for key in ["word", "translation_vi", "translation_en", "context"]:
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
        event_id: Optional[str] = None,
    ) -> Optional[dict]:
        """
        Submit a review and update the kid SM-2 (no-fail box ladder).

        Kid semantics (ages 5-8):
        - quality >= 3 ("know")  → mastery_box +1 (max 5), EF +0.05 (cap 2.2)
        - quality < 3  ("relearn") → box UNCHANGED, EF unchanged, due tomorrow
        There is no punishment path — boxes only ever go up.
        """
        logger.info(f"[NotebookService] Review: entry={entry_id}, quality={quality}")

        entry = await self.repository.submit_review(entry_id, user_id, quality)

        if entry:
            logger.info(
                f"[NotebookService] Updated: box={entry.get('mastery_box')}, "
                f"ease_factor={entry['ease_factor']}, "
                f"interval={entry['interval_days']} days"
            )

        return entry
