from app.routers.admin import router as admin_router
from app.routers.auth import router as auth_router
from app.routers.billing import router as billing_router
from app.routers.games import router as games_router
from app.routers.nodes import router as nodes_router
from app.routers.sessions import router as sessions_router
from app.routers.users import router as users_router

__all__ = [
    "admin_router",
    "auth_router",
    "billing_router",
    "games_router",
    "nodes_router",
    "sessions_router",
    "users_router",
]
