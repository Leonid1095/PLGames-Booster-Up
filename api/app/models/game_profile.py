from typing import Optional

from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class GameProfile(BaseModel):
    __tablename__ = "game_profiles"

    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    exe_names: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    server_ips: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    ports: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    protocol: Mapped[str] = mapped_column(String(10), default="UDP")
    category: Mapped[str] = mapped_column(String(50), default="fps")
    is_popular: Mapped[bool] = mapped_column(Boolean, default=False)
    icon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, default=None)

    sessions = relationship("Session", back_populates="game_profile", lazy="selectin")
