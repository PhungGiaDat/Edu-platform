# backend/repositories/feedback_template_repository.py
"""
Feedback Template Repository - Data Access Layer for feedback_templates collection

Provides CRUD operations and weighted random selection for FeedbackTemplateDocument.
"""
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from datetime import datetime
from database.base_repo import BaseRepository
from models.feedback_template import ScoreCategory, get_score_category
import random
import logging

if TYPE_CHECKING:
    from motor.motor_asyncio import AsyncIOMotorCollection

logger = logging.getLogger(__name__)


class _SafeCursor:
    def sort(self, *args, **kwargs): return self
    def skip(self, *args, **kwargs): return self
    def limit(self, *args, **kwargs): return self
    async def to_list(self, *args, **kwargs): return []
    async def count(self, *args, **kwargs): return 0


class _SafeCollection:
    async def find_one(self, *args, **kwargs): return None
    async def find(self, *args, **kwargs): return _SafeCursor()
    async def count_documents(self, *args, **kwargs): return 0
    async def insert_one(self, *args, **kwargs):
        raise RuntimeError("MongoDB unavailable: feedback_templates not migrated to PostgreSQL")
    async def update_one(self, *args, **kwargs):
        raise RuntimeError("MongoDB unavailable: feedback_templates not migrated to PostgreSQL")


class FeedbackTemplateRepository(BaseRepository):
    """
    Repository for feedback_templates collection.
    Templates are categorized by score range and support weighted random selection.
    """

    def __init__(self):
        try:
            super().__init__("feedback_templates")
        except RuntimeError:
            self._collection = None  # pragma: no cover — postgres_core_enabled=True

    @property
    def collection(self) -> "AsyncIOMotorCollection":
        if self._collection is None:
            return _SafeCollection()  # type: ignore[return-value]
        return self._collection

    # ------------------------------------------------------------------
    # WRITE
    # ------------------------------------------------------------------

    async def create_template(self, data: Dict[str, Any]) -> str:
        """
        Insert a new feedback template.
        Returns the inserted document _id as string.
        """
        data.setdefault("created_at", datetime.utcnow())
        data.setdefault("updated_at", datetime.utcnow())
        data.setdefault("is_active", True)
        data.setdefault("weight", 1)
        data.setdefault("language", "en")

        doc_id = await self.insert_one(data)
        logger.info(
            f"[FeedbackTemplate] Created: category={data.get('category')} "
            f"template={data.get('template')[:50]}..."
        )
        return doc_id

    async def update_template(
        self, template_id: str, data: Dict[str, Any]
    ) -> bool:
        """Update an existing feedback template."""
        from bson import ObjectId

        data["updated_at"] = datetime.utcnow()
        success = await self.update_one(
            {"_id": ObjectId(template_id)},
            {"$set": data}
        )
        if success:
            logger.info(f"[FeedbackTemplate] Updated: id={template_id}")
        return success

    async def delete_template(self, template_id: str) -> bool:
        """Delete a feedback template (soft delete by setting is_active=False)."""
        from bson import ObjectId

        success = await self.update_one(
            {"_id": ObjectId(template_id)},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
        )
        if success:
            logger.info(f"[FeedbackTemplate] Soft deleted: id={template_id}")
        return success

    async def hard_delete_template(self, template_id: str) -> bool:
        """Permanently delete a feedback template."""
        from bson import ObjectId

        success = await self.delete_one({"_id": ObjectId(template_id)})
        if success:
            logger.info(f"[FeedbackTemplate] Hard deleted: id={template_id}")
        return success

    # ------------------------------------------------------------------
    # READ
    # ------------------------------------------------------------------

    async def get_template_by_id(
        self, template_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get a template by its _id."""
        from bson import ObjectId

        doc = await self.find_one({"_id": ObjectId(template_id)})
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def get_templates_by_category(
        self,
        category: ScoreCategory,
        language: str = "en",
        active_only: bool = True,
    ) -> List[Dict[str, Any]]:
        """Get all templates for a given category and language."""
        query: Dict[str, Any] = {"category": category, "language": language}
        if active_only:
            query["is_active"] = True

        docs = await self.find_many(filter=query, limit=100)
        for doc in docs:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
        return docs

    async def get_random_template(
        self,
        category: ScoreCategory,
        language: str = "en",
    ) -> Optional[Dict[str, Any]]:
        """
        Get a random template using weighted selection.
        Templates with higher weight values are more likely to be selected.
        """
        templates = await self.get_templates_by_category(
            category=category,
            language=language,
            active_only=True,
        )

        if not templates:
            logger.warning(
                f"[FeedbackTemplate] No templates found for category={category}"
            )
            return None

        # Weighted random selection
        weights = [t.get("weight", 1) for t in templates]
        selected = random.choices(templates, weights=weights, k=1)[0]

        logger.debug(
            f"[FeedbackTemplate] Selected template: category={category} "
            f"id={selected.get('_id')}"
        )
        return selected

    async def get_template_for_score(
        self,
        score: int,
        language: str = "en",
    ) -> Optional[Dict[str, Any]]:
        """
        Get a random template appropriate for the given score.
        Automatically determines the category from the score.
        """
        category = get_score_category(score)
        return await self.get_random_template(category=category, language=language)

    async def get_all_templates(
        self,
        language: str = "en",
        active_only: bool = True,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get all templates, optionally filtered by language and active status."""
        query: Dict[str, Any] = {"language": language}
        if active_only:
            query["is_active"] = True

        docs = await self.find_many(filter=query, limit=limit)
        for doc in docs:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
        return docs

    async def count_by_category(
        self, category: ScoreCategory, language: str = "en"
    ) -> int:
        """Count templates in a category."""
        return await self.count({
            "category": category,
            "language": language,
            "is_active": True,
        })

    async def bulk_insert_templates(
        self, templates: List[Dict[str, Any]]
    ) -> List[str]:
        """Insert multiple templates at once (for seeding)."""
        now = datetime.utcnow()
        for t in templates:
            t.setdefault("created_at", now)
            t.setdefault("updated_at", now)
            t.setdefault("is_active", True)
            t.setdefault("weight", 1)
            t.setdefault("language", "en")

        ids = await self.insert_many(templates)
        logger.info(f"[FeedbackTemplate] Bulk inserted {len(ids)} templates")
        return ids


def get_feedback_template_repository() -> FeedbackTemplateRepository:
    """Factory function for FastAPI dependency injection."""
    return FeedbackTemplateRepository()
