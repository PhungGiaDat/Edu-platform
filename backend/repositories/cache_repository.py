# backend/repositories/cache_repository.py
"""
Cache Repository - MongoDB-backed cache for session data
Note: This is a fallback when Redis is unavailable.
For primary caching, use Redis directly.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

from models.cache_session import RedisCache, CacheType
from database.connection import db_manager
import logging

logger = logging.getLogger(__name__)

# Default TTLs by cache type (in seconds)
CACHE_TTLS = {
    CacheType.SESSION: 3600,  # 1 hour
    CacheType.USER_PROGRESS: 1800,  # 30 minutes
    CacheType.LEADERBOARD: 300,  # 5 minutes
    CacheType.TRANSLATION: 86400,  # 24 hours
    CacheType.MEDIA_URL: 3600,  # 1 hour
}


class CacheRepository:
    """Repository for RedisCache document operations."""
    
    def __init__(self):
        self.collection_name = "redis_cache"
    
    @property
    def collection(self):
        return db_manager.get_collection(self.collection_name)
    
    async def get(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get a cached value by key."""
        cache_entry = await RedisCache.find_one(RedisCache.cache_key == cache_key)
        
        if not cache_entry:
            return None
        
        # Check if expired
        if cache_entry.expires_at < datetime.utcnow():
            await self.delete(cache_key)
            return None
        
        # Increment hit count
        cache_entry.hit_count += 1
        cache_entry.last_hit_at = datetime.utcnow()
        await cache_entry.save()
        
        return cache_entry.value
    
    async def set(
        self,
        cache_key: str,
        cache_type: CacheType,
        value: Dict[str, Any],
        ttl_seconds: Optional[int] = None
    ) -> RedisCache:
        """Set a cached value."""
        if ttl_seconds is None:
            ttl_seconds = CACHE_TTLS.get(cache_type, 3600)
        
        expires_at = datetime.utcnow() + timedelta(seconds=ttl_seconds)
        
        # Try to find existing entry
        existing = await RedisCache.find_one(RedisCache.cache_key == cache_key)
        
        if existing:
            existing.value = value
            existing.cache_type = cache_type
            existing.ttl_seconds = ttl_seconds
            existing.expires_at = expires_at
            existing.updated_at = datetime.utcnow()
            existing.is_invalidated = False
            await existing.save()
            cache_entry = existing
        else:
            cache_entry = RedisCache(
                cache_key=cache_key,
                cache_type=cache_type,
                value=value,
                ttl_seconds=ttl_seconds,
                expires_at=expires_at,
            )
            await cache_entry.insert()
        
        logger.debug(f"💾 [Cache] Set: {cache_key} (TTL: {ttl_seconds}s)")
        return cache_entry
    
    async def delete(self, cache_key: str) -> bool:
        """Delete a cached value."""
        result = await self.collection.delete_one({"cache_key": cache_key})
        if result.deleted_count > 0:
            logger.debug(f"🗑️ [Cache] Deleted: {cache_key}")
            return True
        return False
    
    async def invalidate(
        self,
        cache_key: str,
        reason: str = "manual"
    ) -> bool:
        """Invalidate a cache entry (mark as invalidated without deleting)."""
        cache_entry = await RedisCache.find_one(RedisCache.cache_key == cache_key)
        if not cache_entry:
            return False
        
        cache_entry.is_invalidated = True
        cache_entry.invalidated_at = datetime.utcnow()
        cache_entry.invalidation_reason = reason
        await cache_entry.save()
        
        logger.info(f"⚠️ [Cache] Invalidated: {cache_key} ({reason})")
        return True
    
    async def invalidate_pattern(self, pattern: str, reason: str = "pattern") -> int:
        """Invalidate all cache entries matching a pattern."""
        import re
        regex = re.compile(pattern.replace("*", ".*"))
        
        cursor = self.collection.find({"cache_key": {"$regex": regex}})
        entries = await cursor.to_list(1000)
        
        count = 0
        for entry in entries:
            entry.is_invalidated = True
            entry.invalidated_at = datetime.utcnow()
            entry.invalidation_reason = reason
            await entry.save()
            count += 1
        
        logger.info(f"⚠️ [Cache] Invalidated {count} entries matching: {pattern}")
        return count
    
    async def get_or_set(
        self,
        cache_key: str,
        cache_type: CacheType,
        factory_fn,
        ttl_seconds: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get cached value or compute and cache it.
        
        Args:
            cache_key: Unique cache key
            cache_type: Type of cache entry
            factory_fn: Async function to compute value if not cached
            ttl_seconds: TTL in seconds
            
        Returns:
            The cached or computed value
        """
        # Try to get from cache
        value = await self.get(cache_key)
        if value is not None:
            return value
        
        # Compute value
        value = await factory_fn()
        
        # Cache it
        await self.set(cache_key, cache_type, value, ttl_seconds)
        
        return value
    
    async def get_by_type(
        self,
        cache_type: CacheType,
        limit: int = 100,
        skip: int = 0
    ) -> List[RedisCache]:
        """Get all cache entries of a specific type."""
        return await RedisCache.find(
            RedisCache.cache_type == cache_type,
            RedisCache.is_invalidated == False,
            RedisCache.expires_at > datetime.utcnow()
        ).sort("-created_at").skip(skip).limit(limit).to_list()
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        pipeline = [
            {"$match": {"is_invalidated": False}},
            {"$group": {
                "_id": "$cache_type",
                "count": {"$sum": 1},
                "total_hits": {"$sum": "$hit_count"},
                "avg_ttl": {"$avg": "$ttl_seconds"}
            }}
        ]
        
        results = await self.collection.aggregate(pipeline).to_list(10)
        
        stats = {
            "total_entries": sum(r["count"] for r in results),
            "total_hits": sum(r["total_hits"] for r in results),
            "by_type": {}
        }
        
        for r in results:
            stats["by_type"][r["_id"]] = {
                "count": r["count"],
                "hits": r["total_hits"],
                "avg_ttl_seconds": round(r["avg_ttl"], 2)
            }
        
        return stats
    
    async def cleanup_expired(self) -> int:
        """Delete all expired cache entries."""
        result = await self.collection.delete_many({
            "expires_at": {"$lt": datetime.utcnow()}
        })
        
        count = result.deleted_count
        if count > 0:
            logger.info(f"🧹 [Cache] Cleaned up {count} expired entries")
        
        return count


# Singleton instance
cache_repo = CacheRepository()


def get_cache_repository() -> CacheRepository:
    return cache_repo
