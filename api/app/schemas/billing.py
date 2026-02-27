import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class PlanInfo(BaseModel):
    name: str
    tier: str
    price_monthly: Decimal
    price_total: Decimal
    duration_days: int
    currency: str = "RUB"


class CreatePaymentRequest(BaseModel):
    plan: str = Field(pattern=r"^(monthly|quarterly|yearly)$")


class PaymentLinkResponse(BaseModel):
    payment_id: uuid.UUID
    payment_url: str
    amount: Decimal
    plan: str


class SubscriptionResponse(BaseModel):
    tier: str
    plan: str
    started_at: datetime | None = None
    expires_at: datetime | None = None
    is_active: bool
    cancelled_at: datetime | None = None
    days_remaining: int

    model_config = {"from_attributes": True}


class PaymentHistoryItem(BaseModel):
    id: uuid.UUID
    amount: Decimal
    currency: str
    status: str
    plan: str
    created_at: datetime

    model_config = {"from_attributes": True}


class WebhookPayload(BaseModel):
    id: int | str | None = None
    sum: str | float | None = None
    comment: str | None = None
    nickname: str | None = None
    currency: str | None = None
    is_test: bool | None = None
