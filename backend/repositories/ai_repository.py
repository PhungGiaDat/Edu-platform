from typing import Optional, List
from database.base_repo import BaseRepository
from models.ai_model import AIConfigSchema
import logging

logger = logging.getLogger(__name__)

class AIRepository(BaseRepository):
    def __init__(self):
        super().__init__("ai_configs")

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
