import time

from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.config import settings

# Per-path rate limit overrides (requests, window_seconds)
AUTH_PATHS = {"/api/auth/register", "/api/auth/login", "/api/auth/refresh"}
AUTH_LIMIT = (5, 60)  # 5 req per 60s
GLOBAL_LIMIT = (100, 60)  # 100 req per 60s


class RateLimitMiddleware:
    """Redis-based sliding window rate limiter (pure ASGI)."""

    def __init__(self, app: ASGIApp):
        self.app = app
        self._redis = None

    async def _get_redis(self):
        if self._redis is None:
            import redis.asyncio as aioredis
            self._redis = aioredis.from_url(
                settings.redis_url, decode_responses=True
            )
        return self._redis

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope["path"]

        # Skip rate limiting for health check
        if path == "/api/health":
            await self.app(scope, receive, send)
            return

        # Extract client IP
        client = scope.get("client")
        client_ip = client[0] if client else "unknown"

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
            pipe.zremrangebyscore(key, 0, now - window)
            pipe.zadd(key, {str(now): now})
            pipe.zcard(key)
            pipe.expire(key, window)
            results = await pipe.execute()
            request_count = results[2]

            if request_count > max_requests:
                response = JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests"},
                )
                await response(scope, receive, send)
                return
        except Exception:
            # If Redis is down, allow the request
            pass

        await self.app(scope, receive, send)
