import time

from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response
from starlette.types import ASGIApp, Receive, Scope, Send

api_requests_total = Counter(
    "api_requests_total",
    "Total API requests",
    ["method", "endpoint", "status_code"],
)

api_request_duration_seconds = Histogram(
    "api_request_duration_seconds",
    "API request duration in seconds",
    ["method", "endpoint"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0),
)

# Paths to exclude from metrics collection (high-cardinality or internal)
_SKIP_PATHS = {"/api/metrics", "/api/health"}


def _normalize_path(path: str) -> str:
    """Collapse UUID/int path segments to reduce label cardinality."""
    parts = path.rstrip("/").split("/")
    normalized = []
    for part in parts:
        if part.isdigit():
            normalized.append("{id}")
        elif len(part) == 36 and part.count("-") == 4:
            normalized.append("{id}")
        else:
            normalized.append(part)
    return "/".join(normalized)


class MetricsMiddleware:
    """Pure ASGI middleware that records request count and duration."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope["path"]

        # Serve metrics endpoint directly
        if path == "/api/metrics":
            body = generate_latest()
            response = Response(
                content=body,
                media_type=CONTENT_TYPE_LATEST,
            )
            await response(scope, receive, send)
            return

        # Skip internal paths
        if path in _SKIP_PATHS:
            await self.app(scope, receive, send)
            return

        method = scope["method"]
        endpoint = _normalize_path(path)
        status_code = 500  # default if something goes wrong

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)

        start = time.perf_counter()
        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            duration = time.perf_counter() - start
            api_requests_total.labels(
                method=method,
                endpoint=endpoint,
                status_code=str(status_code),
            ).inc()
            api_request_duration_seconds.labels(
                method=method,
                endpoint=endpoint,
            ).observe(duration)
