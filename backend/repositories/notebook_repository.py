# backend/repositories/notebook_repository.py
"""
Repository for Notebook Entry CRUD operations
"""
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import logging

logger = logging.getLogger(__name__)


class NotebookRepository:
    """Repository for notebook_entries table"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
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
        query = text("""
            INSERT INTO notebook_entries (
                user_id, word, translation_vi, translation_en, context,
                source, topic, difficulty
            )
            VALUES (
                :user_id, :word, :translation_vi, :translation_en, :context,
                :source, :topic, :difficulty
            )
            RETURNING id, user_id, word, translation_vi, translation_en, context,
                      source, topic, difficulty, created_at, review_count,
                      ease_factor, interval_days
        """)

        result = await self.db.execute(query, {
            "user_id": str(user_id),
            "word": word,
            "translation_vi": translation_vi,
            "translation_en": translation_en,
            "context": context,
            "source": source,
            "topic": topic,
            "difficulty": difficulty,
        })
        row = result.fetchone()
        await self.db.commit()
        return dict(row._mapping) if row else None

    async def get_by_id(self, entry_id: UUID, user_id: UUID) -> Optional[dict]:
        """Get entry by ID, ensure user owns it"""
        query = text("""
            SELECT id, user_id, word, translation_vi, translation_en, context,
                   source, topic, difficulty, created_at, last_reviewed_at,
                   review_count, ease_factor, interval_days, next_review_at
            FROM notebook_entries
            WHERE id = :id AND user_id = :user_id
        """)
        result = await self.db.execute(query, {
            "id": str(entry_id),
            "user_id": str(user_id),
        })
        row = result.fetchone()
        return dict(row._mapping) if row else None

    async def list_by_user(
        self,
        user_id: UUID,
        topic: Optional[str] = None,
        difficulty: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        per_page: int = 20,
    ) -> Tuple[List[dict], int]:
        """List entries for user with filters"""
        # Build WHERE clause
        conditions = ["user_id = :user_id"]
        params = {"user_id": str(user_id)}

        if topic:
            conditions.append("topic = :topic")
            params["topic"] = topic

        if difficulty:
            conditions.append("difficulty = :difficulty")
            params["difficulty"] = difficulty

        if search:
            conditions.append("(word ILIKE :search OR translation_vi ILIKE :search)")
            params["search"] = f"%{search}%"

        where_clause = " AND ".join(conditions)

        # Count total
        count_query = text(f"SELECT COUNT(*) FROM notebook_entries WHERE {where_clause}")
        count_result = await self.db.execute(count_query, params)
        total = count_result.scalar()

        # Get paginated results
        offset = (page - 1) * per_page
        params["offset"] = offset
        params["limit"] = per_page

        list_query = text(f"""
            SELECT id, user_id, word, translation_vi, translation_en, context,
                   source, topic, difficulty, created_at, last_reviewed_at,
                   review_count, ease_factor, interval_days, next_review_at
            FROM notebook_entries
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """)
        result = await self.db.execute(list_query, params)
        rows = result.fetchall()
        items = [dict(row._mapping) for row in rows]

        return items, total

    async def update(
        self,
        entry_id: UUID,
        user_id: UUID,
        **fields,
    ) -> Optional[dict]:
        """Update entry fields"""
        if not fields:
            return await self.get_by_id(entry_id, user_id)

        # Build SET clause
        set_clauses = []
        params = {"id": str(entry_id), "user_id": str(user_id)}

        for key, value in fields.items():
            if value is not None:
                set_clauses.append(f"{key} = :{key}")
                params[key] = value

        if not set_clauses:
            return await self.get_by_id(entry_id, user_id)

        query = text(f"""
            UPDATE notebook_entries
            SET {", ".join(set_clauses)}
            WHERE id = :id AND user_id = :user_id
            RETURNING id, user_id, word, translation_vi, translation_en, context,
                      source, topic, difficulty, created_at, last_reviewed_at,
                      review_count, ease_factor, interval_days, next_review_at
        """)
        result = await self.db.execute(query, params)
        row = result.fetchone()
        await self.db.commit()
        return dict(row._mapping) if row else None

    async def delete(self, entry_id: UUID, user_id: UUID) -> bool:
        """Delete entry"""
        query = text("""
            DELETE FROM notebook_entries
            WHERE id = :id AND user_id = :user_id
            RETURNING id
        """)
        result = await self.db.execute(query, {
            "id": str(entry_id),
            "user_id": str(user_id),
        })
        row = result.fetchone()
        await self.db.commit()
        return row is not None

    async def get_due_cards(
        self,
        user_id: UUID,
        limit: int = 20,
    ) -> List[dict]:
        """Get cards due for review (next_review_at <= now OR is NULL)"""
        query = text("""
            SELECT id, user_id, word, translation_vi, translation_en, context,
                   source, topic, difficulty, created_at, last_reviewed_at,
                   review_count, ease_factor, interval_days, next_review_at
            FROM notebook_entries
            WHERE user_id = :user_id
              AND (next_review_at IS NULL OR next_review_at <= NOW())
            ORDER BY
              CASE WHEN next_review_at IS NULL THEN 1 ELSE 0 END,
              next_review_at ASC
            LIMIT :limit
        """)
        result = await self.db.execute(query, {
            "user_id": str(user_id),
            "limit": limit,
        })
        rows = result.fetchall()
        return [dict(row._mapping) for row in rows]

    async def submit_review(
        self,
        entry_id: UUID,
        user_id: UUID,
        quality: int,
    ) -> Optional[dict]:
        """Submit review and update SM-2 values"""
        query = text("""
            SELECT update_sm2_review(:entry_id, :quality) AS result
        """)
        result = await self.db.execute(query, {
            "entry_id": str(entry_id),
            "quality": quality,
        })
        row = result.fetchone()

        if not row:
            return None

        # Get updated entry
        return await self.get_by_id(entry_id, user_id)
