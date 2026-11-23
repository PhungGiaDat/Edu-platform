# backend/repositories/flashcard_repository.py
"""
Flashcard Repository - Data Access Layer (PostgreSQL only)

De-Mongo Wave 1: PostgreSQL is the sole persistence path.  The
``postgres_core_enabled()`` runtime gate has been removed; there is no Mongo
fallback in this repository anymore.
"""
from typing import Optional, List, Dict, Any
import json
from database.postgres_connection import postgres_pool
import logging

logger = logging.getLogger(__name__)


def _row(row) -> Dict[str, Any]:
    value = dict(row)
    if isinstance(value.get("translation"), str):
        value["translation"] = json.loads(value["translation"])
    return value


class FlashcardRepository:
    """
    Repository for flashcards table
    Handles all database operations related to flashcards
    """

    async def get_by_qr_id(self, qr_id: str) -> Optional[Dict[str, Any]]:
        """
        Find flashcard by QR ID

        Args:
            qr_id: QR code identifier (e.g., 'ele123')

        Returns:
            Flashcard document or None
        """
        logger.debug(f"🔍 [SEARCH] Flashcard by qr_id: {qr_id}")
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.flashcards WHERE qr_id = $1", qr_id
        )
        return _row(row) if row else None

    async def get_all_active(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Return active flashcards for the learner flashcard gallery."""
        rows = await postgres_pool().fetch(
            """SELECT * FROM public.flashcards WHERE is_active = TRUE
               ORDER BY created_at DESC NULLS LAST, qr_id ASC OFFSET $1 LIMIT $2""",
            skip, limit,
        )
        return [_row(row) for row in rows]

    async def get_by_ar_tag(self, ar_tag: str) -> Optional[Dict[str, Any]]:
        """
        Find flashcard by AR tag

        Args:
            ar_tag: AR tracking tag

        Returns:
            Flashcard document or None
        """
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.flashcards WHERE ar_tag = $1 ORDER BY qr_id ASC LIMIT 1", ar_tag
        )
        return _row(row) if row else None

    async def search_by_word(self, word: str) -> List[Dict[str, Any]]:
        """
        Search flashcards by word (case-insensitive)

        Args:
            word: Word to search

        Returns:
            List of flashcard documents
        """
        rows = await postgres_pool().fetch(
            "SELECT * FROM public.flashcards WHERE word ILIKE $1 ORDER BY word ASC, qr_id ASC LIMIT 100",
            f"%{word}%",
        )
        return [_row(row) for row in rows]

    async def get_by_qr_id_and_ar_tag(
        self,
        qr_id: str,
        ar_tag: str
    ) -> Optional[Dict[str, Any]]:
        """
        Find flashcard by both QR ID and AR tag

        Args:
            qr_id: QR code identifier
            ar_tag: AR tracking tag

        Returns:
            Flashcard document or None
        """
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.flashcards WHERE qr_id = $1 AND ar_tag = $2", qr_id, ar_tag
        )
        return _row(row) if row else None

    async def get_by_category(
        self,
        category: str,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get flashcards by category with pagination

        Args:
            category: Category name (e.g., 'animals', 'fruits')
            skip: Number of documents to skip
            limit: Maximum number of documents to return

        Returns:
            List of flashcard documents
        """
        rows = await postgres_pool().fetch(
            """SELECT * FROM public.flashcards WHERE category = $1
               ORDER BY word ASC, qr_id ASC OFFSET $2 LIMIT $3""",
            category, skip, limit,
        )
        return [_row(row) for row in rows]

    async def get_by_difficulty(
        self,
        difficulty: str,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get flashcards by difficulty level

        Args:
            difficulty: Difficulty level ('easy', 'medium', 'hard')
            skip: Number of documents to skip
            limit: Maximum number of documents to return

        Returns:
            List of flashcard documents
        """
        rows = await postgres_pool().fetch(
            "SELECT * FROM public.flashcards WHERE difficulty=$1 ORDER BY qr_id OFFSET $2 LIMIT $3",
            difficulty, skip, limit,
        )
        return [_row(row) for row in rows]

    async def vector_search(
        self,
        query_vector: List[float],
        limit: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic vector search.

        Vector search is a Qdrant responsibility after the MongoDB cutover;
        this repository no longer talks to a vector store.  Returns an empty
        list so callers degrade gracefully.
        """
        if not query_vector:
            logger.warning("[VectorSearch] Empty query vector provided")
        return []

    async def get_flashcards_without_embedding(
        self,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get flashcards that don't have vector embeddings yet.
        Useful for batch embedding generation.

        Returns:
            List of flashcard documents without embeddings
        """
        rows = await postgres_pool().fetch(
            """SELECT qr_id, word, definition, translation
               FROM public.flashcards
               WHERE vector_embedding IS NULL
               LIMIT $1""",
            limit,
        )
        return [_row(row) for row in rows]

    async def update_embedding(
        self,
        qr_id: str,
        embedding: List[float]
    ) -> bool:
        """
        Update vector embedding for a flashcard.

        Args:
            qr_id: Flashcard QR ID
            embedding: Embedding vector from the embedding model

        Returns:
            True if update successful
        """
        try:
            row = await postgres_pool().fetchrow(
                "UPDATE public.flashcards SET vector_embedding=$1::jsonb WHERE qr_id=$2 RETURNING qr_id",
                json.dumps(embedding), qr_id,
            )
            return row is not None
        except Exception as e:
            logger.error(f"[Embedding] Update failed for {qr_id}: {e}")
            return False

    async def get_all_categories(self) -> List[str]:
        """Get list of all unique categories"""
        rows = await postgres_pool().fetch(
            """SELECT DISTINCT category FROM public.flashcards
               WHERE category IS NOT NULL ORDER BY category"""
        )
        return [row["category"] for row in rows]

    async def create(self, flashcard_data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a new flashcard record and return the created row."""
        translation = flashcard_data.get("translation", {})
        if isinstance(translation, str):
            translation = json.loads(translation)
        embedding = flashcard_data.get("vector_embedding")
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.flashcards
               (qr_id, deck_id, teacher_id, ar_tag, word, translation, definition,
                category, image_url, audio_url, difficulty, image_animation_type,
                is_active, vector_embedding, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14::jsonb, now(), now())
               RETURNING *""",
            flashcard_data.get("qr_id"),
            flashcard_data.get("deck_id"),
            flashcard_data.get("teacher_id"),
            flashcard_data.get("ar_tag"),
            flashcard_data.get("word"),
            json.dumps(translation),
            flashcard_data.get("definition"),
            flashcard_data.get("category"),
            flashcard_data.get("image_url"),
            flashcard_data.get("audio_url"),
            flashcard_data.get("difficulty", "easy"),
            flashcard_data.get("image_animation_type"),
            True,
            json.dumps(embedding) if embedding else None,
        )
        logger.info(f"✅ [Flashcard] Created: {flashcard_data.get('qr_id')}")
        return _row(row)

    async def count_by_category(self, category: str) -> int:
        """Count flashcards in a category"""
        row = await postgres_pool().fetchrow(
            "SELECT count(*) AS count FROM public.flashcards WHERE category=$1", category
        )
        return int(row["count"]) if row else 0


def get_flashcard_repository() -> FlashcardRepository:
    """Factory function for dependency injection"""
    return FlashcardRepository()
