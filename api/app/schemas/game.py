import uuid
from datetime import datetime

from pydantic import BaseModel


class GameProfileResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    exe_names: list[str]
    server_ips: list[str]
    ports: list[str]
    protocol: str
    category: str
    is_popular: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class GameListResponse(BaseModel):
    items: list[GameProfileResponse]
    total: int
