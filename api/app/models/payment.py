import uuid
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Payment(BaseModel):
    __tablename__ = "payments"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(10), default="RUB")
    status: Mapped[str] = mapped_column(String(20), default="pending")
    plan: Mapped[str] = mapped_column(String(20))
    donatepay_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    donatepay_comment: Mapped[str | None] = mapped_column(String(500), nullable=True)
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("subscriptions.id"), nullable=True
    )

    user = relationship("User", back_populates="payments")
    subscription = relationship("Subscription", back_populates="payments")
