from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.game_profile import GameProfile
from app.schemas.game import GameListResponse, GameProfileResponse
from app.utils.cache import cache_get, cache_set

router = APIRouter(prefix="/api/games", tags=["games"])

GAMES_CACHE_TTL = 300  # 5 minutes


@router.get("", response_model=GameListResponse)
async def list_games(
    category: str | None = None,
    popular: bool | None = None,
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"games:list:{category}:{popular}"
    cached = await cache_get(cache_key)
    if cached:
        return GameListResponse(**cached)

    query = select(GameProfile)
    if category:
        query = query.where(GameProfile.category == category)
    if popular is not None:
        query = query.where(GameProfile.is_popular == popular)
    query = query.order_by(GameProfile.name)

    result = await db.execute(query)
    games = result.scalars().all()

    response = GameListResponse(
        items=[GameProfileResponse.model_validate(g) for g in games],
        total=len(games),
    )
    await cache_set(cache_key, response.model_dump(), ttl=GAMES_CACHE_TTL)
    return response


@router.get("/search", response_model=GameListResponse)
async def search_games(
    q: str = Query(min_length=1, max_length=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(GameProfile).where(
        func.lower(GameProfile.name).contains(q.lower())
    ).order_by(GameProfile.name)

    result = await db.execute(query)
    games = result.scalars().all()

    return GameListResponse(
        items=[GameProfileResponse.model_validate(g) for g in games],
        total=len(games),
    )


@router.get("/{slug}", response_model=GameProfileResponse)
async def get_game(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(GameProfile).where(GameProfile.slug == slug)
    )
    game = result.scalar_one_or_none()
    if game is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game not found",
        )
    return GameProfileResponse.model_validate(game)
