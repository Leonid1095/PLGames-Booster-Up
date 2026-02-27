from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.game_profile import GameProfile
from app.models.session import Session
from app.models.user import User
from app.schemas.user import UserResponse, UserStats
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/me", tags=["users"])


@router.get("", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)


@router.get("/stats", response_model=UserStats)
async def get_my_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Aggregate session stats
    result = await db.execute(
        select(
            func.count(Session.id).label("total_sessions"),
            func.coalesce(func.sum(Session.bytes_sent), 0).label("total_bytes_sent"),
            func.coalesce(func.sum(Session.bytes_received), 0).label("total_bytes_received"),
            func.avg(Session.avg_ping).label("avg_ping"),
        ).where(Session.user_id == user.id)
    )
    row = result.one()

    # Find favorite game
    fav_result = await db.execute(
        select(GameProfile.name, func.count(Session.id).label("cnt"))
        .join(Session, Session.game_profile_id == GameProfile.id)
        .where(Session.user_id == user.id)
        .group_by(GameProfile.name)
        .order_by(func.count(Session.id).desc())
        .limit(1)
    )
    fav_row = fav_result.first()

    return UserStats(
        total_sessions=row.total_sessions,
        total_bytes_sent=row.total_bytes_sent,
        total_bytes_received=row.total_bytes_received,
        avg_ping=float(row.avg_ping) if row.avg_ping else None,
        favorite_game=fav_row[0] if fav_row else None,
    )
