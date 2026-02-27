from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Node(BaseModel):
    __tablename__ = "nodes"

    name: Mapped[str] = mapped_column(String(100))
    location: Mapped[str] = mapped_column(String(10))  # DE, SE, US, LV
    city: Mapped[str] = mapped_column(String(100))
    ip_address: Mapped[str] = mapped_column(String(45))
    status: Mapped[str] = mapped_column(String(20), default="active")
    current_load: Mapped[int] = mapped_column(Integer, default=0)
    max_sessions: Mapped[int] = mapped_column(Integer, default=1000)
    relay_port: Mapped[int] = mapped_column(Integer, default=443)
    relay_api_port: Mapped[int] = mapped_column(Integer, default=8443)

    sessions = relationship("Session", foreign_keys="[Session.node_id]", back_populates="node", lazy="selectin")
