import math
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.game_profile import GameProfile
from app.models.node import Node
from app.models.payment import Payment
from app.models.promo_code import PromoCode
from app.models.session import Session
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.admin import (
    AdminGameCreate,
    AdminGameResponse,
    AdminGameUpdate,
    AdminNodeCreate,
    AdminNodeResponse,
    AdminNodeUpdate,
    AdminPaymentResponse,
    AdminPromoCreate,
    AdminPromoResponse,
    AdminPromoUpdate,
    AdminSessionResponse,
    AdminStatsResponse,
    AdminSubscriptionResponse,
    AdminSubscriptionUpdate,
    AdminUserResponse,
    AdminUserUpdate,
    PaginatedList,
)
from app.utils.dependencies import get_admin_user

router = APIRouter(prefix="/api/admin", tags=["admin"])


def paginate(total: int, page: int, per_page: int) -> int:
    return max(1, math.ceil(total / per_page))


# ──────────────── Stats ────────────────


@router.get("/stats", response_model=AdminStatsResponse)
async def get_stats(
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    users_count = (await db.execute(select(func.count(User.id)))).scalar() or 0

    now = datetime.now(timezone.utc)
    active_subs = (
        await db.execute(
            select(func.count(Subscription.id)).where(
                Subscription.is_active.is_(True),
                Subscription.expires_at > now,
            )
        )
    ).scalar() or 0

    active_sessions = (
        await db.execute(
            select(func.count(Session.id)).where(Session.status == "active")
        )
    ).scalar() or 0

    thirty_days_ago = now - timedelta(days=30)
    revenue = (
        await db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(
                Payment.status == "completed",
                Payment.created_at >= thirty_days_ago,
            )
        )
    ).scalar()

    return AdminStatsResponse(
        total_users=users_count,
        active_subscriptions=active_subs,
        active_sessions=active_sessions,
        revenue_30d=revenue,
    )


# ──────────────── Users ────────────────


@router.get("/users", response_model=PaginatedList[AdminUserResponse])
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str | None = None,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(User)
    count_q = select(func.count(User.id))

    if search:
        pattern = f"%{search}%"
        filt = or_(User.email.ilike(pattern), User.username.ilike(pattern))
        q = q.where(filt)
        count_q = count_q.where(filt)

    total = (await db.execute(count_q)).scalar() or 0
    result = await db.execute(
        q.order_by(User.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    users = result.scalars().all()

    return PaginatedList(
        items=[AdminUserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        per_page=per_page,
        pages=paginate(total, page, per_page),
    )


@router.get("/users/{user_id}", response_model=AdminUserResponse)
async def get_user(
    user_id: uuid.UUID,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return AdminUserResponse.model_validate(user)


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: uuid.UUID,
    body: AdminUserUpdate,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return AdminUserResponse.model_validate(user)


# ──────────────── Nodes ────────────────


@router.get("/nodes", response_model=list[AdminNodeResponse])
async def list_nodes(
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Node).order_by(Node.location))
    nodes = result.scalars().all()
    return [AdminNodeResponse.model_validate(n) for n in nodes]


@router.post("/nodes", response_model=AdminNodeResponse, status_code=status.HTTP_201_CREATED)
async def create_node(
    body: AdminNodeCreate,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    node = Node(**body.model_dump())
    db.add(node)
    await db.commit()
    await db.refresh(node)
    return AdminNodeResponse.model_validate(node)


@router.patch("/nodes/{node_id}", response_model=AdminNodeResponse)
async def update_node(
    node_id: uuid.UUID,
    body: AdminNodeUpdate,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Node not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(node, field, value)

    await db.commit()
    await db.refresh(node)
    return AdminNodeResponse.model_validate(node)


@router.delete("/nodes/{node_id}", response_model=AdminNodeResponse)
async def delete_node(
    node_id: uuid.UUID,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Node not found")

    node.status = "inactive"
    await db.commit()
    await db.refresh(node)
    return AdminNodeResponse.model_validate(node)


# ──────────────── Games ────────────────


@router.get("/games", response_model=list[AdminGameResponse])
async def list_games(
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GameProfile).order_by(GameProfile.name))
    games = result.scalars().all()
    return [AdminGameResponse.model_validate(g) for g in games]


@router.post("/games", response_model=AdminGameResponse, status_code=status.HTTP_201_CREATED)
async def create_game(
    body: AdminGameCreate,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(GameProfile).where(GameProfile.slug == body.slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "Game with this slug already exists")

    game = GameProfile(**body.model_dump())
    db.add(game)
    await db.commit()
    await db.refresh(game)
    return AdminGameResponse.model_validate(game)


@router.patch("/games/{game_id}", response_model=AdminGameResponse)
async def update_game(
    game_id: uuid.UUID,
    body: AdminGameUpdate,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GameProfile).where(GameProfile.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Game not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(game, field, value)

    await db.commit()
    await db.refresh(game)
    return AdminGameResponse.model_validate(game)


@router.delete("/games/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_game(
    game_id: uuid.UUID,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GameProfile).where(GameProfile.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Game not found")

    await db.delete(game)
    await db.commit()


# ──────────────── Sessions ────────────────


@router.get("/sessions", response_model=PaginatedList[AdminSessionResponse])
async def list_sessions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    user_id: uuid.UUID | None = None,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Session)
    count_q = select(func.count(Session.id))

    if status_filter:
        q = q.where(Session.status == status_filter)
        count_q = count_q.where(Session.status == status_filter)
    if user_id:
        q = q.where(Session.user_id == user_id)
        count_q = count_q.where(Session.user_id == user_id)

    total = (await db.execute(count_q)).scalar() or 0
    result = await db.execute(
        q.order_by(Session.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    sessions = result.scalars().all()

    return PaginatedList(
        items=[AdminSessionResponse.model_validate(s) for s in sessions],
        total=total,
        page=page,
        per_page=per_page,
        pages=paginate(total, page, per_page),
    )


@router.get("/sessions/{session_id}", response_model=AdminSessionResponse)
async def get_session(
    session_id: uuid.UUID,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    return AdminSessionResponse.model_validate(session)


@router.post("/sessions/{session_id}/stop", response_model=AdminSessionResponse)
async def stop_session(
    session_id: uuid.UUID,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    if session.status != "active":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Session is not active")

    session.status = "stopped"
    session.ended_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(session)
    return AdminSessionResponse.model_validate(session)


# ──────────────── Subscriptions ────────────────


@router.get("/subscriptions", response_model=PaginatedList[AdminSubscriptionResponse])
async def list_subscriptions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    count_q = select(func.count(Subscription.id))
    total = (await db.execute(count_q)).scalar() or 0

    result = await db.execute(
        select(Subscription)
        .order_by(Subscription.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    subs = result.scalars().all()

    return PaginatedList(
        items=[AdminSubscriptionResponse.model_validate(s) for s in subs],
        total=total,
        page=page,
        per_page=per_page,
        pages=paginate(total, page, per_page),
    )


@router.patch("/subscriptions/{sub_id}", response_model=AdminSubscriptionResponse)
async def update_subscription(
    sub_id: uuid.UUID,
    body: AdminSubscriptionUpdate,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Subscription).where(Subscription.id == sub_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subscription not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(sub, field, value)

    await db.commit()
    await db.refresh(sub)
    return AdminSubscriptionResponse.model_validate(sub)


# ──────────────── Payments ────────────────


@router.get("/payments", response_model=PaginatedList[AdminPaymentResponse])
async def list_payments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    user_id: uuid.UUID | None = None,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Payment)
    count_q = select(func.count(Payment.id))

    if status_filter:
        q = q.where(Payment.status == status_filter)
        count_q = count_q.where(Payment.status == status_filter)
    if user_id:
        q = q.where(Payment.user_id == user_id)
        count_q = count_q.where(Payment.user_id == user_id)

    total = (await db.execute(count_q)).scalar() or 0
    result = await db.execute(
        q.order_by(Payment.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    payments = result.scalars().all()

    return PaginatedList(
        items=[AdminPaymentResponse.model_validate(p) for p in payments],
        total=total,
        page=page,
        per_page=per_page,
        pages=paginate(total, page, per_page),
    )


# ──────────────── Promos ────────────────


@router.get("/promos", response_model=list[AdminPromoResponse])
async def list_promos(
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PromoCode).order_by(PromoCode.created_at.desc()))
    promos = result.scalars().all()
    return [AdminPromoResponse.model_validate(p) for p in promos]


@router.post("/promos", response_model=AdminPromoResponse, status_code=status.HTTP_201_CREATED)
async def create_promo(
    body: AdminPromoCreate,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(PromoCode).where(PromoCode.code == body.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "Promo code already exists")

    promo = PromoCode(**body.model_dump())
    db.add(promo)
    await db.commit()
    await db.refresh(promo)
    return AdminPromoResponse.model_validate(promo)


@router.patch("/promos/{promo_id}", response_model=AdminPromoResponse)
async def update_promo(
    promo_id: uuid.UUID,
    body: AdminPromoUpdate,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PromoCode).where(PromoCode.id == promo_id))
    promo = result.scalar_one_or_none()
    if not promo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Promo not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(promo, field, value)

    await db.commit()
    await db.refresh(promo)
    return AdminPromoResponse.model_validate(promo)


@router.delete("/promos/{promo_id}", response_model=AdminPromoResponse)
async def delete_promo(
    promo_id: uuid.UUID,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PromoCode).where(PromoCode.id == promo_id))
    promo = result.scalar_one_or_none()
    if not promo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Promo not found")

    promo.is_active = False
    await db.commit()
    await db.refresh(promo)
    return AdminPromoResponse.model_validate(promo)
