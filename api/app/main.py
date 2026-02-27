from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine
from app.routers import auth_router, games_router, nodes_router, sessions_router, users_router
from app.utils.metrics import MetricsMiddleware
from app.utils.rate_limit import RateLimitMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


fastapi_app = FastAPI(
    title="PLGames Booster UP API",
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

fastapi_app.include_router(auth_router)
fastapi_app.include_router(games_router)
fastapi_app.include_router(nodes_router)
fastapi_app.include_router(sessions_router)
fastapi_app.include_router(users_router)


@fastapi_app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


# Production ASGI app: metrics → rate limiting → FastAPI
app = MetricsMiddleware(RateLimitMiddleware(fastapi_app))
