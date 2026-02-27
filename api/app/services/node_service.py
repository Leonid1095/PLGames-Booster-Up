import uuid

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.node import Node


async def find_backup_node(
    db: AsyncSession,
    primary_node_id: uuid.UUID,
    primary_location: str,
) -> Node | None:
    """Find a backup node for multipath: prefer different location, else any other active node."""
    # Try different location first
    result = await db.execute(
        select(Node).where(
            Node.id != primary_node_id,
            Node.status == "active",
            Node.location != primary_location,
        )
    )
    node = result.scalar_one_or_none()
    if node:
        return node

    # Fallback: any other active node
    result = await db.execute(
        select(Node).where(
            Node.id != primary_node_id,
            Node.status == "active",
        )
    )
    return result.scalar_one_or_none()


async def get_node_ping(node_ip: str, relay_api_port: int) -> float | None:
    """Get ping/health from a relay node."""
    url = f"http://{node_ip}:{relay_api_port}/health"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("ping_ms")
    except httpx.RequestError:
        pass
    return None
