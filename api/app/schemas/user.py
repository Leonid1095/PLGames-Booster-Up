import uuid
from datetime import datetime

from pydantic import BaseModel


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    subscription_tier: str
    subscription_expires_at: datetime | None
    is_admin: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class UserStats(BaseModel):
    total_sessions: int
    total_bytes_sent: int
    total_bytes_received: int
    avg_ping: float | None
    favorite_game: str | None
