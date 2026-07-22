# backend/repositories/ar_combination_repository.py
"""
AR Combination Repository - Data Access Layer for multi-marker combos

All methods now use Beanie ODM queries against the ARCombination Document,
replacing the raw Motor/BaseRepository approach. Method signatures are
preserved — callers in ARService see no change.
"""
from typing import Optional, List, Dict, Any
from models.ar_combination import ARCombination
import logging

logger = logging.getLogger(__name__)


def _beanie_to_dict(doc: Optional[ARCombination]) -> Optional[Dict[str, Any]]:
    """
    Convert a Beanie Document to a plain dict with string _id.
    Preserves the dict shape that ARService and api/combos.py expect.
    """
    if doc is None:
        return None
    data = doc.model_dump()
    # Beanie stores _id in the id field as PydanticObjectId — serialize it
    if doc.id is not None:
        data["_id"] = str(doc.id)
    return data


def _beanie_list_to_dict(
    docs: List[ARCombination],
) -> List[Dict[str, Any]]:
    """Convert a list of Beanie Documents to plain dicts."""
    result = []
    for doc in docs:
        data = doc.model_dump()
        if doc.id is not None:
            data["_id"] = str(doc.id)
        result.append(data)
    return result


class ARCombinationRepository:
    """
    Repository for ar_combinations collection using Beanie ODM.

    Handles multi-flashcard AR combos. All methods return plain dicts
    to maintain compatibility with the existing ARService and API layer.
    """

    async def get_by_combo_id(self, combo_id: str) -> Optional[Dict[str, Any]]:
        """
        Find AR combo by combo_id.

        Args:
            combo_id: Combo identifier (e.g., 'elephant_lion_combo')

        Returns:
            AR combination dict or None
        """
        logger.debug(f"[SEARCH] AR Combo by combo_id: {combo_id}")
        doc = await ARCombination.find(ARCombination.combo_id == combo_id).first_or_none()
        return _beanie_to_dict(doc)

    async def find_by_tag(self, ar_tag: str) -> List[Dict[str, Any]]:
        """
        Find all combos that include a specific AR tag.

        Args:
            ar_tag: AR tag to search for in required_tags

        Returns:
            List of AR combination dicts
        """
        logger.debug(f"[SEARCH] AR Combos containing tag: {ar_tag}")
        docs = await ARCombination.find(
            ARCombination.required_tags == ar_tag
        ).to_list()
        return _beanie_list_to_dict(docs)

    async def find_by_tags(self, ar_tags: List[str]) -> List[Dict[str, Any]]:
        """
        Find combos that match ALL provided tags.

        Args:
            ar_tags: List of AR tags

        Returns:
            List of AR combination dicts
        """
        docs = await ARCombination.find(
            ARCombination.required_tags.all(ar_tags)
        ).to_list()
        return _beanie_list_to_dict(docs)

    async def find_by_any_tag(self, ar_tags: List[str]) -> List[Dict[str, Any]]:
        """
        Find combos that contain ANY of the provided tags.

        Args:
            ar_tags: List of AR tags

        Returns:
            List of AR combination dicts
        """
        docs = await ARCombination.find(
            ARCombination.required_tags.in_(ar_tags)
        ).to_list()
        return _beanie_list_to_dict(docs)

    async def find_many(
        self,
        filter: Optional[Dict[str, Any]] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Find multiple combos with pagination.
        Falls back to raw Beanie queries when filter is empty.

        Args:
            filter: MongoDB-style filter dict (only top-level equality supported)
            skip: Number of documents to skip
            limit: Maximum number to return

        Returns:
            List of AR combination dicts
        """
        if not filter:
            docs = (
                await ARCombination.find_all()
                .skip(skip)
                .limit(limit)
                .to_list()
            )
        else:
            # Build Beanie query from filter dict
            # Supports: {"field": value} and {"field": {"$in": [...]}}
            queries = []
            for field, value in filter.items():
                if isinstance(value, dict) and "$in" in value:
                    queries.append(getattr(ARCombination, field).in_(value["$in"]))
                elif isinstance(value, dict) and "$all" in value:
                    queries.append(getattr(ARCombination, field).all(value["$all"]))
                else:
                    queries.append(getattr(ARCombination, field) == value)
            if queries:
                docs = (
                    await ARCombination.find(*queries)
                    .skip(skip)
                    .limit(limit)
                    .to_list()
                )
            else:
                docs = []
        return _beanie_list_to_dict(docs)


def get_ar_combination_repository() -> ARCombinationRepository:
    """Factory function for dependency injection"""
    return ARCombinationRepository()
