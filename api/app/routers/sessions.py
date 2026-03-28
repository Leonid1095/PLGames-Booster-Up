from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.game_profile import GameProfile
from app.models.node import Node
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

    # Reload session with all relationships in a single query
    result = await db.execute(
        select(Session)
        .where(Session.id == session.id)
        .options(selectinload(Session.node), selectinload(Session.game_profile), selectinload(Session.backup_node))
    )
    session = result.scalar_one()

    return SessionStartResponse(
        session_id=session.id,
        session_token=session.session_token,
        node_ip=session.node.ip_address,
        node_port=session.node.relay_port,
        backup_node_ip=session.backup_node.ip_address if session.backup_node else None,
        backup_node_port=session.backup_node.relay_port if session.backup_node else None,
        multipath_enabled=session.multipath_enabled,
        status=session.status,
        game_server_ips=session.game_profile.server_ips or [],
        game_ports=session.game_profile.ports or [],
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
        .options(selectinload(Session.game_profile), selectinload(Session.node))
        .order_by(Session.created_at.desc())
        .limit(50)
    )
    sessions = result.scalars().all()

    return [
        SessionHistoryItem(
            id=s.id,
            game_name=s.game_profile.name if s.game_profile else "Unknown",
            node_location=s.node.location if s.node else "Unknown",
            status=s.status,
            started_at=s.started_at,
            ended_at=s.ended_at,
            avg_ping=s.avg_ping,
            bytes_sent=s.bytes_sent,
            bytes_received=s.bytes_received,
            multipath_enabled=s.multipath_enabled,
        )
        for s in sessions
    ]
