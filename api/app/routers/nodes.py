from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.node import Node
from app.schemas.node import NodePingResponse, NodeResponse
from app.services.node_service import get_node_ping

router = APIRouter(prefix="/api/nodes", tags=["nodes"])


@router.get("", response_model=list[NodeResponse])
async def list_nodes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Node).where(Node.status == "active").order_by(Node.location)
    )
    nodes = result.scalars().all()
    return [NodeResponse.model_validate(n) for n in nodes]


@router.get("/{node_id}/ping", response_model=NodePingResponse)
async def ping_node(node_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    if node is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found",
        )

    ping_ms = await get_node_ping(node.ip_address, node.relay_api_port)
    return NodePingResponse(
        node_id=node.id,
        ping_ms=ping_ms,
        status="ok" if ping_ms is not None else "unreachable",
    )
