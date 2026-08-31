# backend/repositories/cache_repository.py
"""
Cache Repository - STRIPPED (De-Mongo Wave 4)

De-Mongo Wave 4: this Mongo/Beanie-backed cache fallback had **no consumers**
anywhere in the codebase and no corresponding PostgreSQL table.  Primary
caching is Redis (see ``services/redis_service.py``); the ``redis_cache`` Mongo
collection was only a durability fallback that the web-first product does not
use.  Per the migration rule "do not migrate unused legacy data merely for
theoretical parity", no PostgreSQL ``redis_cache`` table was created.

This module remains import-compatible so that nothing breaks, but every method
raises ``NotImplementedError`` to fail loudly rather than silently drop writes.
"""
from typing import Optional, Dict, Any, List


class CacheRepository:
    """Stub kept for import compatibility. Raises NotImplementedError."""

    def __init__(self):
        self.collection_name = "redis_cache"  # legacy Mongo collection, not migrated

    async def get(self, cache_key: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError(
            "CacheRepository was stripped in De-Mongo W4 (no consumers, no "
            "PostgreSQL table). Use Redis directly via RedisService."
        )

    async def set(self, *args, **kwargs):
        raise NotImplementedError(
            "CacheRepository was stripped in De-Mongo W4 (no consumers, no "
            "PostgreSQL table). Use Redis directly via RedisService."
        )

    async def delete(self, *args, **kwargs):
        raise NotImplementedError(
            "CacheRepository was stripped in De-Mongo W4 (no consumers, no "
            "PostgreSQL table). Use Redis directly via RedisService."
        )

    async def invalidate(self, *args, **kwargs):
        raise NotImplementedError(
            "CacheRepository was stripped in De-Mongo W4 (no consumers, no "
            "PostgreSQL table). Use Redis directly via RedisService."
        )

    async def invalidate_pattern(self, *args, **kwargs):
        raise NotImplementedError(
            "CacheRepository was stripped in De-Mongo W4 (no consumers, no "
            "PostgreSQL table). Use Redis directly via RedisService."
        )

    async def get_or_set(self, *args, **kwargs):
        raise NotImplementedError(
            "CacheRepository was stripped in De-Mongo W4 (no consumers, no "
            "PostgreSQL table). Use Redis directly via RedisService."
        )

    async def get_by_type(self, *args, **kwargs):
        raise NotImplementedError(
            "CacheRepository was stripped in De-Mongo W4 (no consumers, no "
            "PostgreSQL table). Use Redis directly via RedisService."
        )

    async def get_stats(self, *args, **kwargs):
        raise NotImplementedError(
            "CacheRepository was stripped in De-Mongo W4 (no consumers, no "
            "PostgreSQL table). Use Redis directly via RedisService."
        )

    async def cleanup_expired(self, *args, **kwargs):
        raise NotImplementedError(
            "CacheRepository was stripped in De-Mongo W4 (no consumers, no "
            "PostgreSQL table). Use Redis directly via RedisService."
        )


# Singleton instance (kept for import compatibility)
cache_repo = CacheRepository()


def get_cache_repository() -> CacheRepository:
    return cache_repo
