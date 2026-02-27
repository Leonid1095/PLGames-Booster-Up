import time

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.config import settings

# Per-path rate limit overrides (requests, window_seconds)
AUTH_PATHS = {"/api/auth/register", "/api/auth/login", "/api/auth/refresh"}
AUTH_LIMIT = (5, 60)  # 5 req per 60s
GLOBAL_LIMIT = (100, 60)  # 100 req per 60s


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Redis-based sliding window rate limiter."""

    def __init__(self, app, redis_client=None):
        super().__init__(app)
        self._redis = redis_client

    async def _get_redis(self):
        if self._redis is None:
            import redis.asyncio as aioredis
            self._redis = aioredis.from_url(
                settings.redis_url, decode_responses=True
            )
        return self._redis

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip rate limiting for health check
        if request.url.path == "/api/health":
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path

        # Determine limit
        if path in AUTH_PATHS:
            max_requests, window = AUTH_LIMIT
            key = f"rl:auth:{client_ip}:{path}"
        else:
            max_requests, window = GLOBAL_LIMIT
            key = f"rl:global:{client_ip}"

        try:
            r = await self._get_redis()
            now = time.time()
            pipe = r.pipeline()
            # Remove old entries
            pipe.zremrangebyscore(key, 0, now - window)
            # Add current request
            pipe.zadd(key, {str(now): now})
            # Count requests in window
            pipe.zcard(key)
            # Set expiry
            pipe.expire(key, window)
            results = await pipe.execute()
            request_count = results[2]

            if request_count > max_requests:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests"},
                )
        except Exception:
            # If Redis is down, allow the request
            pass

        return await call_next(request)
