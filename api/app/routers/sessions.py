from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.session import Session
from app.models.user import User
from app.schemas.session import (
    SessionHistoryItem,
    SessionStartRequest,
    SessionStartResponse,
    SessionStopResponse,
)
from app.services.session_service import start_session, stop_session
from app.utils.dependencies import get_current_user, get_subscribed_user

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("/start", response_model=SessionStartResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    body: SessionStartRequest,
    user: User = Depends(get_subscribed_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        session = await start_session(
            db=db,
            user_id=str(user.id),
            game_slug=body.game_slug,
            node_id=str(body.node_id),
            multipath=body.multipath,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Load node for response
    from app.models.node import Node
    from app.models.game_profile import GameProfile
    result = await db.execute(select(Node).where(Node.id == session.node_id))
    node = result.scalar_one()

    # Load game profile for server IPs/ports
    game_result = await db.execute(select(GameProfile).where(GameProfile.id == session.game_profile_id))
    game = game_result.scalar_one()

    # Load backup node if multipath
    backup_node_ip = None
    backup_node_port = None
    if session.backup_node_id:
        result = await db.execute(select(Node).where(Node.id == session.backup_node_id))
        backup_node = result.scalar_one_or_none()
        if backup_node:
            backup_node_ip = backup_node.ip_address
            backup_node_port = backup_node.relay_port

    return SessionStartResponse(
        session_id=session.id,
        session_token=session.session_token,
        node_ip=node.ip_address,
        node_port=node.relay_port,
        backup_node_ip=backup_node_ip,
        backup_node_port=backup_node_port,
        multipath_enabled=session.multipath_enabled,
        status=session.status,
        game_server_ips=game.server_ips or [],
        game_ports=game.ports or [],
    )


@router.post("/{session_id}/stop", response_model=SessionStopResponse)
async def end_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        session = await stop_session(db=db, session_id=session_id, user_id=str(user.id))
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    duration = None
    if session.started_at and session.ended_at:
        duration = int((session.ended_at - session.started_at).total_seconds())

    return SessionStopResponse(
        session_id=session.id,
        status=session.status,
        duration_seconds=duration,
        bytes_sent=session.bytes_sent,
        bytes_received=session.bytes_received,
    )


@router.get("/history", response_model=list[SessionHistoryItem])
async def session_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session)
        .where(Session.user_id == user.id)
        .order_by(Session.created_at.desc())
        .limit(50)
    )
    sessions = result.scalars().all()

    items = []
    for s in sessions:
        # Load related data
        from app.models.game_profile import GameProfile
        from app.models.node import Node

        game_result = await db.execute(select(GameProfile).where(GameProfile.id == s.game_profile_id))
        game = game_result.scalar_one_or_none()
        node_result = await db.execute(select(Node).where(Node.id == s.node_id))
        node = node_result.scalar_one_or_none()

        items.append(SessionHistoryItem(
            id=s.id,
            game_name=game.name if game else "Unknown",
            node_location=node.location if node else "Unknown",
            status=s.status,
            started_at=s.started_at,
            ended_at=s.ended_at,
            avg_ping=s.avg_ping,
            bytes_sent=s.bytes_sent,
            bytes_received=s.bytes_received,
            multipath_enabled=s.multipath_enabled,
        ))

    return items
