"""PostgreSQL repository for AR multi-card combinations."""
from typing import Optional, List, Dict, Any
import json

from database.postgres_connection import postgres_pool


def _row(row) -> dict:
    return dict(row)


class ARCombinationRepository:
    async def _hydrate(self, row) -> Optional[Dict[str, Any]]:
        if row is None:
            return None
        value = _row(row)
        for key in ("center_transform", "animation", "flashcard_set", "target_order"):
            if isinstance(value.get(key), str):
                value[key] = json.loads(value[key])
        if not isinstance(value.get("flashcard_set"), str):
            value["flashcard_set"] = None
        tags = await postgres_pool().fetch(
            "SELECT ar_tag FROM public.ar_combination_required_tags WHERE combo_id=$1 ORDER BY tag_order", value["combo_id"]
        )
        value["required_tags"] = [tag["ar_tag"] for tag in tags]
        if isinstance(value.get("animation"), dict):
            value["animation"] = value["animation"].get("type")
        return value

    async def get_by_combo_id(self, combo_id: str) -> Optional[Dict[str, Any]]:
        return await self._hydrate(await postgres_pool().fetchrow(
            "SELECT * FROM public.ar_combinations WHERE combo_id=$1", combo_id
        ))

    async def find_by_tag(self, ar_tag: str) -> List[Dict[str, Any]]:
        rows = await postgres_pool().fetch(
            """SELECT c.* FROM public.ar_combinations c JOIN public.ar_combination_required_tags t USING(combo_id)
               WHERE t.ar_tag=$1 ORDER BY c.priority DESC,c.combo_id""", ar_tag
        )
        return [await self._hydrate(row) for row in rows]

    async def find_by_tags(self, ar_tags: List[str]) -> List[Dict[str, Any]]:
        if not ar_tags:
            return []
        rows = await postgres_pool().fetch(
            """SELECT c.* FROM public.ar_combinations c JOIN public.ar_combination_required_tags t USING(combo_id)
               WHERE t.ar_tag = ANY($1::text[]) GROUP BY c.combo_id
               HAVING count(DISTINCT t.ar_tag) = cardinality($1::text[]) ORDER BY max(c.priority) DESC""", ar_tags
        )
        return [await self._hydrate(row) for row in rows]

    async def find_by_any_tag(self, ar_tags: List[str]) -> List[Dict[str, Any]]:
        rows = await postgres_pool().fetch(
            """SELECT DISTINCT c.* FROM public.ar_combinations c JOIN public.ar_combination_required_tags t USING(combo_id)
               WHERE t.ar_tag = ANY($1::text[]) ORDER BY c.priority DESC,c.combo_id""", ar_tags
        )
        return [await self._hydrate(row) for row in rows]

    async def find_many(self, filter: Optional[Dict[str, Any]] = None, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        rows = await postgres_pool().fetch(
            "SELECT * FROM public.ar_combinations ORDER BY priority DESC,combo_id OFFSET $1 LIMIT $2", skip, limit
        )
        return [await self._hydrate(row) for row in rows]


def get_ar_combination_repository() -> ARCombinationRepository:
    return ARCombinationRepository()
