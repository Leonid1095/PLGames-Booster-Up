import json
import logging

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

_redis: aioredis.Redis | None = None


async def _get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def cache_get(key: str) -> dict | list | None:
    """Get a value from Redis cache. Returns None on miss or error."""
    try:
        r = await _get_redis()
        data = await r.get(key)
        if data:
            return json.loads(data)
    except Exception:
        logger.debug("Cache miss/error for %s", key)
    return None


async def cache_set(key: str, value: dict | list, ttl: int = 300) -> None:
    """Set a value in Redis cache with TTL in seconds."""
    try:
        r = await _get_redis()
        await r.set(key, json.dumps(value, default=str), ex=ttl)
    except Exception:
        logger.debug("Cache set error for %s", key)
