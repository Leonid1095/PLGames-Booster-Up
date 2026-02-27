import uuid
from datetime import datetime
from decimal import Decimal
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginatedList(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    per_page: int
    pages: int


# --- Users ---

class AdminUserResponse(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    subscription_tier: str
    subscription_expires_at: datetime | None
    trial_used: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AdminUserUpdate(BaseModel):
    subscription_tier: str | None = None
    subscription_expires_at: datetime | None = None
    is_admin: bool | None = None


# --- Nodes ---

class AdminNodeResponse(BaseModel):
    id: uuid.UUID
    name: str
    location: str
    city: str
    ip_address: str
    status: str
    current_load: int
    max_sessions: int
    relay_port: int
    relay_api_port: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AdminNodeCreate(BaseModel):
    name: str
    location: str
    city: str
    ip_address: str
    status: str = "active"
    max_sessions: int = 1000
    relay_port: int = 443
    relay_api_port: int = 8443


class AdminNodeUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    city: str | None = None
    ip_address: str | None = None
    status: str | None = None
    max_sessions: int | None = None
    relay_port: int | None = None
    relay_api_port: int | None = None


# --- Games ---

class AdminGameResponse(BaseModel):
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
    updated_at: datetime

    model_config = {"from_attributes": True}


class AdminGameCreate(BaseModel):
    name: str
    slug: str
    exe_names: list[str] = []
    server_ips: list[str] = []
    ports: list[str] = []
    protocol: str = "UDP"
    category: str = "fps"
    is_popular: bool = False


class AdminGameUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    exe_names: list[str] | None = None
    server_ips: list[str] | None = None
    ports: list[str] | None = None
    protocol: str | None = None
    category: str | None = None
    is_popular: bool | None = None


# --- Sessions ---

class AdminSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    node_id: uuid.UUID
    game_profile_id: uuid.UUID
    session_token: int
    status: str
    started_at: datetime | None
    ended_at: datetime | None
    bytes_sent: int
    bytes_received: int
    avg_ping: float | None
    packet_loss: float | None
    backup_node_id: uuid.UUID | None = None
    multipath_enabled: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Subscriptions ---

class AdminSubscriptionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    tier: str
    plan: str
    started_at: datetime
    expires_at: datetime
    is_active: bool
    cancelled_at: datetime | None
    payment_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminSubscriptionUpdate(BaseModel):
    expires_at: datetime | None = None
    is_active: bool | None = None
    tier: str | None = None


# --- Payments ---

class AdminPaymentResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    amount: Decimal
    currency: str
    status: str
    plan: str
    promo_code: str | None
    original_amount: Decimal | None
    donatepay_id: str | None
    subscription_id: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Promos ---

class AdminPromoResponse(BaseModel):
    id: uuid.UUID
    code: str
    discount_percent: int
    discount_amount: Decimal | None
    max_uses: int
    current_uses: int
    valid_from: datetime | None
    valid_until: datetime | None
    applicable_plans: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AdminPromoCreate(BaseModel):
    code: str
    discount_percent: int = 0
    discount_amount: Decimal | None = None
    max_uses: int = 0
    valid_from: datetime | None = None
    valid_until: datetime | None = None
    applicable_plans: str = "all"
    is_active: bool = True


class AdminPromoUpdate(BaseModel):
    code: str | None = None
    discount_percent: int | None = None
    discount_amount: Decimal | None = None
    max_uses: int | None = None
    valid_from: datetime | None = None
    valid_until: datetime | None = None
    applicable_plans: str | None = None
    is_active: bool | None = None


# --- Stats ---

class AdminStatsResponse(BaseModel):
    total_users: int
    active_subscriptions: int
    active_sessions: int
    revenue_30d: Decimal
