# backend/utils/cache.py
"""
Cache utility with Redis backend support.

Optimized for multi-worker deployments:
- Uses Redis when available for distributed caching
- Falls back to in-memory cache when Redis is unavailable
- TTL-based expiration
- Thread-safe for async operations

Use cases:
- Pet catalog (changes rarely)
- User stats (cached for short periods)
- API response caching
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, Optional, TypeVar
from functools import wraps

logger = logging.getLogger(__name__)

T = TypeVar('T')


class SimpleCache:
    """
    Simple in-memory cache with TTL support.
    
    Designed for single-worker deployments or as fallback when Redis unavailable.
    For multi-worker, use RedisCacheService instead.
    """
    
    def __init__(self, default_ttl: int = 300):
        """
        Args:
            default_ttl: Default time-to-live in seconds (default: 5 minutes)
        """
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._default_ttl = default_ttl
        self._lock = asyncio.Lock()
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired."""
        async with self._lock:
            if key not in self._cache:
                return None
            
            entry = self._cache[key]
            if datetime.utcnow() > entry['expires_at']:
                del self._cache[key]
                return None
            
            return entry['value']
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache with optional custom TTL."""
        async with self._lock:
            expires_at = datetime.utcnow() + timedelta(seconds=ttl or self._default_ttl)
            self._cache[key] = {
                'value': value,
                'expires_at': expires_at,
                'created_at': datetime.utcnow()
            }
    
    async def delete(self, key: str) -> bool:
        """Delete a key from cache."""
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching a pattern (simple startswith match)."""
        async with self._lock:
            keys_to_delete = [k for k in self._cache.keys() if k.startswith(pattern)]
            for key in keys_to_delete:
                del self._cache[key]
            return len(keys_to_delete)
    
    async def clear(self) -> None:
        """Clear all cached data."""
        async with self._lock:
            self._cache.clear()
    
    async def cleanup_expired(self) -> int:
        """Remove all expired entries. Call periodically."""
        async with self._lock:
            now = datetime.utcnow()
            expired_keys = [
                k for k, v in self._cache.items() 
                if now > v['expires_at']
            ]
            for key in expired_keys:
                del self._cache[key]
            
            if expired_keys:
                logger.debug(f"[Cache] Cleaned up {len(expired_keys)} expired entries")
            
            return len(expired_keys)
    
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return {
            'total_entries': len(self._cache),
            'default_ttl': self._default_ttl,
        }


class RedisCache:
    """
    Redis-backed cache adapter.
    
    Wraps the Redis service to provide the same interface as SimpleCache.
    """
    
    def __init__(self, default_ttl: int = 300):
        self._default_ttl = default_ttl
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from Redis cache."""
        from services.redis_service import redis_service
        
        value = await redis_service.get(key)
        if value is None:
            return None
        
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in Redis cache."""
        from services.redis_service import redis_service
        
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        elif not isinstance(value, str):
            value = str(value)
        
        await redis_service.set(key, value, ttl_seconds=ttl or self._default_ttl)
    
    async def delete(self, key: str) -> bool:
        """Delete a key from Redis cache."""
        from services.redis_service import redis_service
        return await redis_service.delete(key)
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        from services.redis_service import redis_service
        return await redis_service.delete_pattern(pattern)
    
    async def clear(self) -> None:
        """Clear all cached data (use with caution!)."""
        from services.redis_service import redis_service
        await redis_service.delete_pattern("*")
    
    async def cleanup_expired(self) -> int:
        """Redis handles expiration automatically."""
        return 0
    
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return {
            'type': 'redis',
            'default_ttl': self._default_ttl,
        }


def get_cache_backend() -> Any:
    """
    Get the appropriate cache backend.
    
    Returns RedisCache if Redis is available, SimpleCache otherwise.
    """
    from services.redis_service import redis_service
    
    if redis_service._is_connected:
        return RedisCache()
    return SimpleCache()


# ========== Global Cache Instances ==========

# Pet catalog cache (longer TTL - catalog changes rarely)
pet_cache = SimpleCache(default_ttl=600)  # 10 minutes

# User stats cache (shorter TTL - changes more frequently)
user_stats_cache = SimpleCache(default_ttl=60)  # 1 minute


# ========== Cache Decorators ==========

def cached(cache: Any, key_prefix: str, ttl: Optional[int] = None):
    """
    Decorator for caching async function results.
    
    Usage:
        @cached(pet_cache, "pets_list", ttl=300)
        async def get_all_pets():
            return await PetDocument.find_all().to_list()
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            # Generate cache key from function args
            key_parts = [key_prefix]
            key_parts.extend(str(arg) for arg in args if arg is not None)
            key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()) if v is not None)
            cache_key = ":".join(key_parts)
            
            # Try to get from cache
            cached_value = await cache.get(cache_key)
            if cached_value is not None:
                logger.debug(f"[Cache] HIT: {cache_key}")
                return cached_value
            
            # Cache miss - call function
            logger.debug(f"[Cache] MISS: {cache_key}")
            result = await func(*args, **kwargs)
            
            # Store in cache
            await cache.set(cache_key, result, ttl)
            
            return result
        
        return wrapper
    return decorator


# ========== Cache Keys ==========

class CacheKeys:
    """Cache key constants for consistency."""
    
    # Pet catalog (all active pets)
    ALL_PETS = "pets:all"
    
    # User-specific stats
    @staticmethod
    def user_stats(user_id: str) -> str:
        return f"user:stats:{user_id}"
    
    # User's pet data
    @staticmethod
    def user_pets(user_id: str) -> str:
        return f"user:pets:{user_id}"
    
    # Session data
    @staticmethod
    def session(session_id: str) -> str:
        return f"session:{session_id}"
    
    # App lock
    @staticmethod
    def app_lock(user_id: str) -> str:
        return f"app_lock:user:{user_id}"


# ========== Utility Functions ==========

async def invalidate_user_cache(user_id: str) -> None:
    """Invalidate all cached data for a user."""
    await user_stats_cache.delete(CacheKeys.user_stats(user_id))
    await pet_cache.delete(CacheKeys.user_pets(user_id))


async def invalidate_pet_catalog() -> None:
    """Invalidate pet catalog cache (call after admin updates)."""
    await pet_cache.delete(CacheKeys.ALL_PETS)
    await pet_cache.delete_pattern("user:pets:")
