import uuid
from datetime import datetime

from pydantic import BaseModel


class SessionStartRequest(BaseModel):
    game_slug: str
    node_id: uuid.UUID


class SessionStartResponse(BaseModel):
    session_id: uuid.UUID
    session_token: int
    node_ip: str
    node_port: int
    status: str


class SessionStopRequest(BaseModel):
    pass


class SessionStopResponse(BaseModel):
    session_id: uuid.UUID
    status: str
    duration_seconds: int | None
    bytes_sent: int
    bytes_received: int


class SessionHistoryItem(BaseModel):
    id: uuid.UUID
    game_name: str
    node_location: str
    status: str
    started_at: datetime | None
    ended_at: datetime | None
    avg_ping: float | None
    bytes_sent: int
    bytes_received: int

    model_config = {"from_attributes": True}
