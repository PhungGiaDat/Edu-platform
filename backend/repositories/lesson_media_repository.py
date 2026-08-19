# backend/repositories/lesson_media_repository.py
"""
Lesson Media Repository - Data Access Layer for media_assets collection
"""
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from datetime import datetime
from database.base_repo import BaseRepository
import logging

if TYPE_CHECKING:
    from motor.motor_asyncio import AsyncIOMotorCollection

logger = logging.getLogger(__name__)


class _SafeCursor:
    def sort(self, *args, **kwargs): return self
    def skip(self, *args, **kwargs): return self
    def limit(self, *args, **kwargs): return self
    async def to_list(self, *args, **kwargs): return []


class _SafeCollection:
    async def find_one(self, *args, **kwargs): return None
    async def find(self, *args, **kwargs): return _SafeCursor()
    async def count_documents(self, *args, **kwargs): return 0
    async def aggregate(self, *args, **kwargs): return _SafeCursor()
    async def insert_one(self, *args, **kwargs):
        raise RuntimeError("MongoDB unavailable: media_assets not migrated to PostgreSQL")
    async def update_one(self, *args, **kwargs):
        raise RuntimeError("MongoDB unavailable: media_assets not migrated to PostgreSQL")


class LessonMediaRepository(BaseRepository):
    """
    Repository for media_assets collection.
    Stores media assets associated with lessons (video, images, audio).
    """

    def __init__(self):
        try:
            super().__init__("media_assets")
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

    async def create_media_asset(self, asset_data: Dict[str, Any]) -> str:
        """
        Create a new media asset record.
        Returns the inserted document _id as string.
        """
        asset_data.setdefault("created_at", datetime.utcnow())
        asset_data.setdefault("updated_at", datetime.utcnow())
        asset_data.setdefault("status", "ready")
        doc_id = await self.insert_one(asset_data)
        logger.info(
            f"[Media] Created asset: lesson={asset_data.get('lesson_id')} "
            f"type={asset_data.get('type')} id={doc_id}"
        )
        return doc_id

    async def update_media_asset(
        self,
        asset_id: str,
        update_data: Dict[str, Any]
    ) -> bool:
        """Update a media asset record."""
        update_data["updated_at"] = datetime.utcnow()
        result = await self.collection.update_one(
            {"asset_id": asset_id},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def delete_media_asset(self, asset_id: str) -> bool:
        """Delete a media asset record."""
        result = await self.collection.delete_one({"asset_id": asset_id})
        return result.deleted_count > 0

    async def delete_media_assets(self, asset_ids: List[str]) -> int:
        """Delete multiple media assets by IDs."""
        result = await self.collection.delete_many({"asset_id": {"$in": asset_ids}})
        return result.deleted_count

    # ------------------------------------------------------------------
    # READ
    # ------------------------------------------------------------------

    async def get_media_by_lesson(
        self,
        lesson_id: str,
        course_id: Optional[str] = None,
        media_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get all media assets for a lesson."""
        query: Dict[str, Any] = {"lesson_id": lesson_id}
        if course_id:
            query["course_id"] = course_id
        if media_type:
            query["type"] = media_type

        docs = await self.find_many(
            filter=query,
            sort=[("created_at", 1)]
        )
        return docs

    async def get_media_by_section(
        self,
        lesson_id: str,
        section_id: str
    ) -> List[Dict[str, Any]]:
        """Get all media assets for a lesson section."""
        docs = await self.find_many(
            filter={
                "lesson_id": lesson_id,
                "section_id": section_id
            },
            sort=[("created_at", 1)]
        )
        return docs

    async def get_media_asset(self, asset_id: str) -> Optional[Dict[str, Any]]:
        """Get a single media asset by ID."""
        return await self.find_one({"asset_id": asset_id})

    async def get_video_for_lesson(
        self,
        lesson_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get video asset for a lesson (if exists)."""
        docs = await self.find_many(
            filter={
                "lesson_id": lesson_id,
                "type": "video",
                "status": "ready"
            },
            limit=1
        )
        return docs[0] if docs else None

    async def get_images_for_lesson(
        self,
        lesson_id: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get all image assets for a lesson."""
        docs = await self.find_many(
            filter={
                "lesson_id": lesson_id,
                "type": "image",
                "status": "ready"
            },
            limit=limit,
            sort=[("created_at", 1)]
        )
        return docs


def get_lesson_media_repository() -> LessonMediaRepository:
    """Factory function for FastAPI dependency injection."""
    return LessonMediaRepository()
