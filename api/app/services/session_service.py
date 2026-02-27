import random
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game_profile import GameProfile
from app.models.node import Node
from app.models.session import Session
from app.services.node_service import find_backup_node
from app.services.relay_client import register_session_on_relay, unregister_session_on_relay


def generate_session_token() -> int:
    """Generate a random session token compatible with PLG Protocol u32."""
    return random.randint(1, 2**31 - 1)


async def start_session(
    db: AsyncSession,
    user_id: str,
    game_slug: str,
    node_id: str,
    multipath: bool = False,
) -> Session:
    # Find game profile
    result = await db.execute(
        select(GameProfile).where(GameProfile.slug == game_slug)
    )
    game = result.scalar_one_or_none()
    if game is None:
        raise ValueError("Game not found")

    # Find node
    result = await db.execute(
        select(Node).where(Node.id == node_id, Node.status == "active")
    )
    node = result.scalar_one_or_none()
    if node is None:
        raise ValueError("Node not found or inactive")

    # Check for existing active session
    result = await db.execute(
        select(Session).where(
            Session.user_id == user_id,
            Session.status == "active",
        )
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        raise ValueError("User already has an active session")

    # Generate token and create session
    session_token = generate_session_token()

    # Multipath: find backup node
    backup_node = None
    multipath_enabled = False
    if multipath:
        backup_node = await find_backup_node(db, node.id, node.location)
        if backup_node:
            multipath_enabled = True

    session = Session(
        user_id=user_id,
        node_id=node_id,
        game_profile_id=game.id,
        session_token=session_token,
        status="active",
        started_at=datetime.now(timezone.utc),
        backup_node_id=backup_node.id if backup_node else None,
        multipath_enabled=multipath_enabled,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Register on primary relay (best-effort)
    await register_session_on_relay(
        node_ip=node.ip_address,
        relay_api_port=node.relay_api_port,
        session_token=session_token,
        game_server_ips=game.server_ips,
        game_ports=game.ports,
    )

    # Register on backup relay if multipath
    if backup_node:
        await register_session_on_relay(
            node_ip=backup_node.ip_address,
            relay_api_port=backup_node.relay_api_port,
            session_token=session_token,
            game_server_ips=game.server_ips,
            game_ports=game.ports,
        )

    return session


async def stop_session(
    db: AsyncSession,
    session_id: str,
    user_id: str,
) -> Session:
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.user_id == user_id,
            Session.status == "active",
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise ValueError("Active session not found")

    session.status = "stopped"
    session.ended_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(session)

    # Load node for relay unregister
    result = await db.execute(select(Node).where(Node.id == session.node_id))
    node = result.scalar_one_or_none()
    if node:
        await unregister_session_on_relay(
            node_ip=node.ip_address,
            relay_api_port=node.relay_api_port,
            session_token=session.session_token,
        )

    # Unregister from backup relay if multipath
    if session.backup_node_id:
        result = await db.execute(select(Node).where(Node.id == session.backup_node_id))
        backup_node = result.scalar_one_or_none()
        if backup_node:
            await unregister_session_on_relay(
                node_ip=backup_node.ip_address,
                relay_api_port=backup_node.relay_api_port,
                session_token=session.session_token,
            )

    return session
