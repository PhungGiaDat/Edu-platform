"""
Parental Controls Repository - Data Access Layer
Handles learning paths and time limits
"""
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from database.base_repo import BaseRepository
from datetime import datetime
import logging

if TYPE_CHECKING:
    from motor.motor_asyncio import AsyncIOMotorCollection

logger = logging.getLogger(__name__)


class _SafeEmptyCollection:
    """No-op collection returned when MongoDB is unavailable.
    Read methods return safe empty defaults so services continue to work.
    Write methods raise RuntimeError since mutating unmigrated data is unsafe.
    """

    async def find_one(self, *args, **kwargs):
        return None

    async def find(self, *args, **kwargs):
        return _SafeCursor()

    async def count_documents(self, *args, **kwargs):
        return 0

    async def insert_one(self, *args, **kwargs):
        raise RuntimeError("MongoDB unavailable: parental_controls not migrated to PostgreSQL")

    async def update_one(self, *args, **kwargs):
        raise RuntimeError("MongoDB unavailable: parental_controls not migrated to PostgreSQL")

    async def find_one_and_update(self, *args, **kwargs):
        raise RuntimeError("MongoDB unavailable: parental_controls not migrated to PostgreSQL")


class _SafeCursor:
    """No-op cursor returned by find() on unavailable MongoDB."""
    def sort(self, *args, **kwargs): return self
    def skip(self, *args, **kwargs): return self
    def limit(self, *args, **kwargs): return self
    async def to_list(self, *args, **kwargs): return []
    async def count(self, *args, **kwargs): return 0


class ParentalControlsRepository(BaseRepository):
    """Repository for parental_controls collection"""

    def __init__(self):
        try:
            super().__init__("parental_controls")
        except RuntimeError:
            self._collection = None  # pragma: no cover — postgres_core_enabled=True

    @property
    def collection(self) -> "AsyncIOMotorCollection":
        if self._collection is None:
            return _SafeEmptyCollection()  # type: ignore[return-value]
        return self._collection


def get_parental_controls_repository() -> ParentalControlsRepository:
    return ParentalControlsRepository()
