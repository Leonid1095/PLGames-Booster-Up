from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.game_profile import GameProfile
from app.models.game_suggestion import GameSuggestion
from app.models.user import User
from app.schemas.game import GameListResponse, GameProfileResponse
from app.utils.cache import cache_get, cache_set
from app.utils.dependencies import get_current_user

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


# ── Game Suggestions ────────────────────────────────────────────────

class SuggestGameRequest(BaseModel):
    exe_name: str = Field(min_length=2, max_length=255)
    window_title: str | None = Field(default=None, max_length=500)


class SuggestGameResponse(BaseModel):
    id: str
    exe_name: str
    status: str
    vote_count: int
    message: str


@router.post("/suggest", response_model=SuggestGameResponse, status_code=status.HTTP_201_CREATED)
async def suggest_game(
    body: SuggestGameRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exe_lower = body.exe_name.lower().strip()

    # Check if this exe already matches a known game
    result = await db.execute(select(GameProfile))
    for game in result.scalars().all():
        if any(e.lower() == exe_lower for e in game.exe_names):
            return SuggestGameResponse(
                id=str(game.id),
                exe_name=body.exe_name,
                status="exists",
                vote_count=0,
                message=f"Игра уже в базе: {game.name}",
            )

    # Check if already suggested — increment vote
    existing = await db.execute(
        select(GameSuggestion).where(
            func.lower(GameSuggestion.exe_name) == exe_lower,
            GameSuggestion.status == "pending",
        )
    )
    suggestion = existing.scalar_one_or_none()

    if suggestion:
        suggestion.vote_count += 1
        await db.commit()
        return SuggestGameResponse(
            id=str(suggestion.id),
            exe_name=suggestion.exe_name,
            status="pending",
            vote_count=suggestion.vote_count,
            message="Голос учтён! Игра уже в очереди на добавление.",
        )

    # Create new suggestion
    suggestion = GameSuggestion(
        exe_name=body.exe_name,
        window_title=body.window_title,
        suggested_by=user.id,
    )
    db.add(suggestion)
    await db.commit()
    await db.refresh(suggestion)

    return SuggestGameResponse(
        id=str(suggestion.id),
        exe_name=suggestion.exe_name,
        status="pending",
        vote_count=1,
        message="Спасибо! Игра отправлена на рассмотрение.",
    )
