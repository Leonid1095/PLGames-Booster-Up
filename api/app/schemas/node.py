import uuid
from datetime import datetime

from pydantic import BaseModel


class NodeResponse(BaseModel):
    id: uuid.UUID
    name: str
    location: str
    city: str
    ip_address: str
    status: str
    current_load: int
    max_sessions: int
    relay_port: int
    created_at: datetime

    model_config = {"from_attributes": True}


class NodePingResponse(BaseModel):
    node_id: uuid.UUID
    ping_ms: float | None
    status: str
