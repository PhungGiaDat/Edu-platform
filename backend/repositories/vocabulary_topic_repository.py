# backend/repositories/vocabulary_topic_repository.py
"""
Repository for Vocabulary Topics
"""
from typing import Optional, List
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import logging

logger = logging.getLogger(__name__)


class VocabularyTopicRepository:
    """Repository for vocabulary_topics table"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_active(self) -> List[dict]:
        """Get all active vocabulary topics"""
        query = text("""
            SELECT id, slug, name, name_vi, description, icon, color,
                   is_ielts, ielts_band, sort_order, is_active
            FROM vocabulary_topics
            WHERE is_active = true
            ORDER BY is_ielts ASC, sort_order ASC, name ASC
        """)
        result = await self.db.execute(query)
        rows = result.fetchall()
        return [dict(row._mapping) for row in rows]

    async def get_by_slug(self, slug: str) -> Optional[dict]:
        """Get topic by slug"""
        query = text("""
            SELECT id, slug, name, name_vi, description, icon, color,
                   is_ielts, ielts_band, sort_order, is_active
            FROM vocabulary_topics
            WHERE slug = :slug AND is_active = true
        """)
        result = await self.db.execute(query, {"slug": slug})
        row = result.fetchone()
        return dict(row._mapping) if row else None
