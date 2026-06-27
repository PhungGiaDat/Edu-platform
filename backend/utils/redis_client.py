# backend/utils/redis_client.py
"""
Redis client with fallback to in-memory cache.

Features:
- Connection management with retry logic
- Fallback to in-memory cache when Redis unavailable
- Session storage with TTL support
- App lock functionality (20-30 min auto-lock)
- Pub/sub for distributed notifications
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from settings import settings

logger = logging.getLogger(__name__)

T = Any


class InMemoryFallbackCache:
    """Fallback cache when Redis is unavailable."""

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}

    async def get(self, key: str) -> Optional[Any]:
        if key not in self._cache:
            return None
        entry = self._cache[key]
        if datetime.utcnow() > entry["expires_at"]:
            del self._cache[key]
            return None
        return entry["value"]

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        self._cache[key] = {
            "value": value,
            "expires_at": datetime.utcnow() + timedelta(seconds=ttl),
        }

    async def delete(self, key: str) -> bool:
        if key in self._cache:
            del self._cache[key]
            return True
        return False

    async def exists(self, key: str) -> bool:
        if key not in self._cache:
            return False
        entry = self._cache[key]
        if datetime.utcnow() > entry["expires_at"]:
            del self._cache[key]
            return False
        return True

    async def expire(self, key: str, ttl: int) -> bool:
        if key not in self._cache:
            return False
        self._cache[key]["expires_at"] = datetime.utcnow() + timedelta(seconds=ttl)
        return True

    async def ttl(self, key: str) -> int:
        if key not in self._cache:
            return -2
        entry = self._cache[key]
        remaining = (entry["expires_at"] - datetime.utcnow()).total_seconds()
        if remaining <= 0:
            del self._cache[key]
            return -2
        return int(remaining)

    async def keys(self, pattern: str = "*") -> list:
        result = []
        prefix = pattern.rstrip("*")
        for key in list(self._cache.keys()):
            if key.startswith(prefix):
                entry = self._cache[key]
                if datetime.utcnow() <= entry["expires_at"]:
                    result.append(key)
                else:
                    del self._cache[key]
        return result

    async def flushdb(self) -> None:
        self._cache.clear()


class RedisClient:
    """
    Redis client wrapper with automatic fallback to in-memory cache.

    Supports:
    - Connection pooling
    - Automatic reconnection
    - JSON serialization
    - Session storage with TTL
    - App lock management
    """

    _instance: Optional["RedisClient"] = None
    _lock: asyncio.Lock = None

    def __init__(self):
        self._redis = None
        self._fallback = InMemoryFallbackCache()
        self._connected = False
        self._use_fallback = False

    @classmethod
    async def get_instance(cls) -> "RedisClient":
        """Get or create singleton instance."""
        if cls._lock is None:
            cls._lock = asyncio.Lock()

        async with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
                await cls._instance._connect()
            return cls._instance

    async def _connect(self) -> None:
        """Connect to Redis or enable fallback mode."""
        redis_url = settings.redis_url
        if not redis_url:
            logger.warning("[Redis] Redis URL not configured, using in-memory fallback")
            self._use_fallback = True
            return

        try:
            import redis.asyncio as redis

            self._redis = redis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=settings.REDIS_SOCKET_CONNECT_TIMEOUT,
                socket_timeout=settings.REDIS_SOCKET_TIMEOUT,
            )
            await asyncio.wait_for(self._redis.ping(), timeout=settings.REDIS_SOCKET_TIMEOUT)
            self._connected = True
            self._use_fallback = False
            logger.info("[Redis] Connected successfully")
        except Exception as e:
            logger.warning(f"[Redis] Connection failed: {e}, using in-memory fallback")
            self._use_fallback = True
            self._connected = False

    async def reconnect(self) -> bool:
        """Attempt to reconnect to Redis."""
        redis_url = settings.redis_url
        if not redis_url:
            return False
        try:
            import redis.asyncio as redis

            if self._redis:
                await self._redis.aclose()
            self._redis = redis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=settings.REDIS_SOCKET_CONNECT_TIMEOUT,
                socket_timeout=settings.REDIS_SOCKET_TIMEOUT,
            )
            await asyncio.wait_for(self._redis.ping(), timeout=settings.REDIS_SOCKET_TIMEOUT)
            self._connected = True
            self._use_fallback = False
            logger.info("[Redis] Reconnected successfully")
            return True
        except Exception as e:
            logger.warning(f"[Redis] Reconnect failed: {e}")
            self._use_fallback = True
            self._connected = False
            return False

    @property
    def is_connected(self) -> bool:
        return self._connected and not self._use_fallback

    @property
    def using_fallback(self) -> bool:
        return self._use_fallback

    # ========== Basic Operations ==========

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if self._use_fallback:
            return await self._fallback.get(key)

        try:
            value = await self._redis.get(key)
            if value is None:
                return None
            return json.loads(value)
        except Exception as e:
            logger.warning(f"[Redis] GET error: {e}, falling back")
            self._use_fallback = True
            return await self._fallback.get(key)

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with optional TTL."""
        if ttl is None:
            ttl = settings.REDIS_TTL

        json_value = json.dumps(value, default=str)

        if self._use_fallback:
            await self._fallback.set(key, value, ttl)
            return True

        try:
            await self._redis.setex(key, ttl, json_value)
            return True
        except Exception as e:
            logger.warning(f"[Redis] SET error: {e}, falling back")
            self._use_fallback = True
            await self._fallback.set(key, value, ttl)
            return True

    async def delete(self, key: str) -> bool:
        """Delete a key from cache."""
        if self._use_fallback:
            return await self._fallback.delete(key)

        try:
            result = await self._redis.delete(key)
            return bool(result)
        except Exception as e:
            logger.warning(f"[Redis] DELETE error: {e}, falling back")
            self._use_fallback = True
            return await self._fallback.delete(key)

    async def exists(self, key: str) -> bool:
        """Check if key exists."""
        if self._use_fallback:
            return await self._fallback.exists(key)

        try:
            return bool(await self._redis.exists(key))
        except Exception as e:
            logger.warning(f"[Redis] EXISTS error: {e}, falling back")
            self._use_fallback = True
            return await self._fallback.exists(key)

    async def expire(self, key: str, ttl: int) -> bool:
        """Set expiration on a key."""
        if self._use_fallback:
            return await self._fallback.expire(key, ttl)

        try:
            return bool(await self._redis.expire(key, ttl))
        except Exception as e:
            logger.warning(f"[Redis] EXPIRE error: {e}, falling back")
            self._use_fallback = True
            return await self._fallback.expire(key, ttl)

    async def ttl(self, key: str) -> int:
        """Get remaining TTL for a key."""
        if self._use_fallback:
            return await self._fallback.ttl(key)

        try:
            return await self._redis.ttl(key)
        except Exception as e:
            logger.warning(f"[Redis] TTL error: {e}, falling back")
            self._use_fallback = True
            return await self._fallback.ttl(key)

    async def keys(self, pattern: str = "*") -> list:
        """Get all keys matching pattern."""
        if self._use_fallback:
            return await self._fallback.keys(pattern)

        try:
            keys = await self._redis.keys(pattern)
            return [k for k in keys if not k.startswith("_") or k.startswith("session:")]
        except Exception as e:
            logger.warning(f"[Redis] KEYS error: {e}, falling back")
            self._use_fallback = True
            return await self._fallback.keys(pattern)

    # ========== Hash Operations ==========

    async def hset(self, name: str, key: str, value: Any) -> bool:
        """Set hash field."""
        if self._use_fallback:
            data = await self._fallback.get(name) or {}
            data[key] = value
            await self._fallback.set(name, data, settings.REDIS_TTL)
            return True

        try:
            json_value = json.dumps(value, default=str)
            await self._redis.hset(name, key, json_value)
            return True
        except Exception as e:
            logger.warning(f"[Redis] HSET error: {e}, falling back")
            self._use_fallback = True
            data = await self._fallback.get(name) or {}
            data[key] = value
            await self._fallback.set(name, data, settings.REDIS_TTL)
            return True

    async def hget(self, name: str, key: str) -> Optional[Any]:
        """Get hash field."""
        if self._use_fallback:
            data = await self._fallback.get(name) or {}
            return data.get(key)

        try:
            value = await self._redis.hget(name, key)
            if value is None:
                return None
            return json.loads(value)
        except Exception as e:
            logger.warning(f"[Redis] HGET error: {e}, falling back")
            self._use_fallback = True
            data = await self._fallback.get(name) or {}
            return data.get(key)

    async def hgetall(self, name: str) -> Dict[str, Any]:
        """Get all hash fields."""
        if self._use_fallback:
            return await self._fallback.get(name) or {}

        try:
            data = await self._redis.hgetall(name)
            return {k: json.loads(v) for k, v in data.items()}
        except Exception as e:
            logger.warning(f"[Redis] HGETALL error: {e}, falling back")
            self._use_fallback = True
            return await self._fallback.get(name) or {}

    async def hdel(self, name: str, *keys: str) -> int:
        """Delete hash fields."""
        if self._use_fallback:
            data = await self._fallback.get(name) or {}
            for key in keys:
                data.pop(key, None)
            await self._fallback.set(name, data, settings.REDIS_TTL)
            return len(keys)

        try:
            return await self._redis.hdel(name, *keys)
        except Exception as e:
            logger.warning(f"[Redis] HDEL error: {e}, falling back")
            self._use_fallback = True
            data = await self._fallback.get(name) or {}
            for key in keys:
                data.pop(key, None)
            await self._fallback.set(name, data, settings.REDIS_TTL)
            return len(keys)

    # ========== Lock Operations ==========

    async def set_lock(self, lock_key: str, value: Any, ttl: int) -> bool:
        """Set a lock with TTL (atomic with SET NX)."""
        lock_key = f"lock:{lock_key}"

        if self._use_fallback:
            await self._fallback.set(lock_key, value, ttl)
            return True

        try:
            import redis.asyncio as redis

            result = await self._redis.set(lock_key, json.dumps(value, default=str), nx=True, ex=ttl)
            return result is not None
        except Exception as e:
            logger.warning(f"[Redis] SET LOCK error: {e}, falling back")
            self._use_fallback = True
            await self._fallback.set(lock_key, value, ttl)
            return True

    async def release_lock(self, lock_key: str) -> bool:
        """Release a lock."""
        lock_key = f"lock:{lock_key}"

        if self._use_fallback:
            return await self._fallback.delete(lock_key)

        try:
            result = await self._redis.delete(lock_key)
            return bool(result)
        except Exception as e:
            logger.warning(f"[Redis] RELEASE LOCK error: {e}, falling back")
            self._use_fallback = True
            return await self._fallback.delete(lock_key)

    async def check_lock(self, lock_key: str) -> Optional[Any]:
        """Check if a lock exists and return its value."""
        lock_key = f"lock:{lock_key}"

        if self._use_fallback:
            return await self._fallback.get(lock_key)

        try:
            value = await self._redis.get(lock_key)
            if value is None:
                return None
            return json.loads(value)
        except Exception as e:
            logger.warning(f"[Redis] CHECK LOCK error: {e}, falling back")
            self._use_fallback = True
            return await self._fallback.get(lock_key)

    # ========== Cleanup ==========

    async def close(self) -> None:
        """Close Redis connection."""
        if self._redis:
            try:
                await self._redis.aclose()
            except Exception:
                pass
            self._redis = None
            self._connected = False
        logger.info("[Redis] Connection closed")


# ========== Convenience Functions ==========

_redis_instance: Optional[RedisClient] = None


async def get_redis() -> RedisClient:
    """Get Redis client instance."""
    global _redis_instance
    if _redis_instance is None:
        _redis_instance = await RedisClient.get_instance()
    return _redis_instance


async def close_redis() -> None:
    """Close Redis connection on shutdown."""
    global _redis_instance
    if _redis_instance:
        await _redis_instance.close()
        _redis_instance = None
