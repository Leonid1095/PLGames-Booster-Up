from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class PromoCode(BaseModel):
    __tablename__ = "promo_codes"

    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    discount_percent: Mapped[int] = mapped_column(Integer, default=0)
    discount_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    max_uses: Mapped[int] = mapped_column(Integer, default=0)  # 0 = unlimited
    current_uses: Mapped[int] = mapped_column(Integer, default=0)
    valid_from: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    valid_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    applicable_plans: Mapped[str] = mapped_column(
        String(100), default="all"
    )  # "all" or "monthly,quarterly,yearly"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
