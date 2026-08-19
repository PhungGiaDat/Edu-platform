from typing import Optional, List, TYPE_CHECKING
from database.base_repo import BaseRepository
from models.ai_model import AIConfigSchema
import logging

if TYPE_CHECKING:
    from motor.motor_asyncio import AsyncIOMotorCollection

logger = logging.getLogger(__name__)


class _SafeCollection:
    async def find_one(self, *args, **kwargs): return None
    async def insert_one(self, *args, **kwargs):
        raise RuntimeError("MongoDB unavailable: ai_configs not migrated to PostgreSQL")


class AIRepository(BaseRepository):
    def __init__(self):
        try:
            super().__init__("ai_configs")
        except RuntimeError:
            self._collection = None  # pragma: no cover — postgres_core_enabled=True

    @property
    def collection(self) -> "AsyncIOMotorCollection":
        if self._collection is None:
            return _SafeCollection()  # type: ignore[return-value]
        return self._collection

    async def get_active_config(self) -> Optional[AIConfigSchema]:
        """Retrieve the currently active AI configuration."""
        config = await self.collection.find_one({"is_active": True})
        if config:
            return AIConfigSchema(**config)
        return None

    async def create_config(self, config: AIConfigSchema) -> str:
        """Create a new AI configuration."""
        result = await self.collection.insert_one(config.model_dump(by_alias=True, exclude={"id"}))
        return str(result.inserted_id)


def get_ai_repository() -> AIRepository:
    return AIRepository()
