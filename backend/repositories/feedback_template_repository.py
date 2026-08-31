# backend/repositories/feedback_template_repository.py
"""
Feedback Template Repository - Data Access Layer for feedback_templates (PostgreSQL)

De-Mongo Wave 5: PostgreSQL is the sole persistence path.  The Mongo
``feedback_templates`` collection is replaced by ``public.feedback_templates``.
All methods use raw SQL via ``postgres_pool()`` and return plain dicts.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from database.postgres_connection import postgres_pool
from models.feedback_template import ScoreCategory, get_score_category
import random
import logging

logger = logging.getLogger(__name__)


class FeedbackTemplateRepository:
    """
    Repository for public.feedback_templates table.
    Templates are categorized by score range and support weighted random selection.
    """

    @staticmethod
    def _row(row) -> Optional[Dict[str, Any]]:
        """Convert an asyncpg Record to a plain dict with _id string key."""
        if row is None:
            return None
        value = dict(row)
        value["_id"] = str(value.pop("id"))
        return value

    # ------------------------------------------------------------------
    # WRITE
    # ------------------------------------------------------------------

    async def create_template(self, data: Dict[str, Any]) -> str:
        """Insert a new feedback template. Returns the inserted id as string."""
        data.setdefault("created_at", datetime.utcnow())
        data.setdefault("updated_at", datetime.utcnow())
        data.setdefault("is_active", True)
        data.setdefault("weight", 1)
        data.setdefault("language", "en")
        data.setdefault("emoji", "⭐")

        row = await postgres_pool().fetchrow(
            """INSERT INTO public.feedback_templates
                   (category, template, emoji, weight, language, is_active, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               RETURNING id""",
            data.get("category"),
            data.get("template", ""),
            data.get("emoji", "⭐"),
            int(data.get("weight", 1)),
            data.get("language", "en"),
            bool(data.get("is_active", True)),
            data["created_at"],
            data["updated_at"],
        )
        doc_id = str(row["id"])
        logger.info(
            f"[FeedbackTemplate] Created: category={data.get('category')} "
            f"template={data.get('template')[:50]}..."
        )
        return doc_id

    async def update_template(self, template_id: str, data: Dict[str, Any]) -> bool:
        """Update an existing feedback template."""
        data["updated_at"] = datetime.utcnow()
        set_clauses = []
        values: List[Any] = []
        for key in ("category", "template", "emoji", "weight", "language",
                    "is_active", "updated_at"):
            if key in data:
                set_clauses.append(f"{key} = ${len(values) + 2}")
                values.append(data[key])
        if not set_clauses:
            return False
        row = await postgres_pool().fetchrow(
            f"""UPDATE public.feedback_templates
                SET {', '.join(set_clauses)}
                WHERE id=$1
                RETURNING id""",
            int(template_id), *values,
        )
        if row:
            logger.info(f"[FeedbackTemplate] Updated: id={template_id}")
        return row is not None

    async def delete_template(self, template_id: str) -> bool:
        """Soft delete a feedback template (is_active=False)."""
        row = await postgres_pool().fetchrow(
            """UPDATE public.feedback_templates
               SET is_active=FALSE, updated_at=$2
               WHERE id=$1
               RETURNING id""",
            int(template_id), datetime.utcnow(),
        )
        if row:
            logger.info(f"[FeedbackTemplate] Soft deleted: id={template_id}")
        return row is not None

    async def hard_delete_template(self, template_id: str) -> bool:
        """Permanently delete a feedback template."""
        n = await postgres_pool().execute(
            "DELETE FROM public.feedback_templates WHERE id=$1", int(template_id)
        )
        success = n and " 1" in str(n)
        if success:
            logger.info(f"[FeedbackTemplate] Hard deleted: id={template_id}")
        return success

    # ------------------------------------------------------------------
    # READ
    # ------------------------------------------------------------------

    async def get_template_by_id(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Get a template by its id."""
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.feedback_templates WHERE id=$1", int(template_id)
        )
        return self._row(row)

    async def get_templates_by_category(
        self,
        category: ScoreCategory,
        language: str = "en",
        active_only: bool = True,
    ) -> List[Dict[str, Any]]:
        """Get all templates for a given category and language."""
        rows = await postgres_pool().fetch(
            """SELECT * FROM public.feedback_templates
               WHERE category=$1 AND language=$2
                 AND ($3::boolean OR is_active)
               ORDER BY id ASC
               LIMIT 100""",
            category, language, not active_only,
        )
        return [self._row(r) for r in rows]

    async def get_random_template(
        self,
        category: ScoreCategory,
        language: str = "en",
    ) -> Optional[Dict[str, Any]]:
        """Get a random template using weighted selection."""
        templates = await self.get_templates_by_category(
            category=category, language=language, active_only=True,
        )

        if not templates:
            logger.warning(
                f"[FeedbackTemplate] No templates found for category={category}"
            )
            return None

        weights = [int(t.get("weight", 1)) for t in templates]
        selected = random.choices(templates, weights=weights, k=1)[0]

        logger.debug(
            f"[FeedbackTemplate] Selected template: category={category} "
            f"id={selected.get('_id')}"
        )
        return selected

    async def get_template_for_score(
        self, score: int, language: str = "en"
    ) -> Optional[Dict[str, Any]]:
        """Get a random template appropriate for the given score."""
        category = get_score_category(score)
        return await self.get_random_template(category=category, language=language)

    async def get_all_templates(
        self,
        language: str = "en",
        active_only: bool = True,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get all templates, optionally filtered by language and active status."""
        rows = await postgres_pool().fetch(
            """SELECT * FROM public.feedback_templates
               WHERE language=$1
                 AND ($2::boolean OR is_active)
               ORDER BY id ASC
               LIMIT $3""",
            language, not active_only, limit,
        )
        return [self._row(r) for r in rows]

    async def count_by_category(
        self, category: ScoreCategory, language: str = "en"
    ) -> int:
        """Count active templates in a category."""
        return await postgres_pool().fetchval(
            """SELECT count(*)::int FROM public.feedback_templates
               WHERE category=$1 AND language=$2 AND is_active=TRUE""",
            category, language,
        )

    async def bulk_insert_templates(self, templates: List[Dict[str, Any]]) -> List[str]:
        """Insert multiple templates at once (for seeding)."""
        now = datetime.utcnow()
        ids: List[str] = []
        for t in templates:
            t.setdefault("created_at", now)
            t.setdefault("updated_at", now)
            t.setdefault("is_active", True)
            t.setdefault("weight", 1)
            t.setdefault("language", "en")
            t.setdefault("emoji", "⭐")
            row = await postgres_pool().fetchrow(
                """INSERT INTO public.feedback_templates
                       (category, template, emoji, weight, language, is_active, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                   RETURNING id""",
                t.get("category"), t.get("template", ""), t.get("emoji", "⭐"),
                int(t.get("weight", 1)), t.get("language", "en"),
                bool(t.get("is_active", True)), t["created_at"], t["updated_at"],
            )
            ids.append(str(row["id"]))
        logger.info(f"[FeedbackTemplate] Bulk inserted {len(ids)} templates")
        return ids


def get_feedback_template_repository() -> FeedbackTemplateRepository:
    """Factory function for FastAPI dependency injection."""
    return FeedbackTemplateRepository()