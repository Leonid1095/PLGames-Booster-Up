import random
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game_profile import GameProfile
from app.models.node import Node
from app.models.session import Session
from app.services.relay_client import register_session_on_relay, unregister_session_on_relay


def generate_session_token() -> int:
    """Generate a random session token compatible with PLG Protocol u32."""
    return random.randint(1, 2**31 - 1)


async def start_session(
    db: AsyncSession,
    user_id: str,
    game_slug: str,
    node_id: str,
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
    session = Session(
        user_id=user_id,
        node_id=node_id,
        game_profile_id=game.id,
        session_token=session_token,
        status="active",
        started_at=datetime.now(timezone.utc),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Register on relay (best-effort, don't fail session creation)
    await register_session_on_relay(
        node_ip=node.ip_address,
        relay_api_port=node.relay_api_port,
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

    return session
