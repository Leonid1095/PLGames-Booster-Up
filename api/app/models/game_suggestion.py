import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class GameSuggestion(BaseModel):
    __tablename__ = "game_suggestions"

    exe_name: Mapped[str] = mapped_column(String(255), index=True)
    window_title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    suggested_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    vote_count: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, approved, rejected
    approved_game_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("game_profiles.id"), nullable=True)

    user = relationship("User")
