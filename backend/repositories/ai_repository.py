"""PostgreSQL repository for AI configuration (De-Mongo Wave 5).

Maps to ``public.ai_configs`` table.
"""
from typing import Optional
import json
import logging

from database.postgres_connection import postgres_pool
from models.ai_model import AIConfigSchema

logger = logging.getLogger(__name__)


class AIRepository:
    """PostgreSQL repository for AI configuration."""

    async def get_active_config(self) -> Optional[AIConfigSchema]:
        """Retrieve the currently active AI configuration."""
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.ai_configs WHERE is_active=TRUE ORDER BY id DESC LIMIT 1"
        )
        if row is None:
            return None
        config = dict(row)
        # Merge JSONB config field into the top-level dict
        cfg = config.pop("config", {}) or {}
        if isinstance(cfg, str):
            cfg = json.loads(cfg)
        config.update(cfg)
        return AIConfigSchema(**config)

    async def create_config(self, config: AIConfigSchema) -> str:
        """Create a new AI configuration."""
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.ai_configs(name, config, is_active)
               VALUES($1, $2::jsonb, $3) RETURNING id""",
            config.model_name or "default",
            json.dumps(config.model_dump(by_alias=False, exclude={"id", "created_at"})),
            config.is_active,
        )
        return str(row["id"])


def get_ai_repository() -> AIRepository:
    return AIRepository()