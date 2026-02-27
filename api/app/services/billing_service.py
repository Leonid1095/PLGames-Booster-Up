import hashlib
import hmac
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from urllib.parse import quote

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.payment import Payment
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.billing import PlanInfo

PLANS: dict[str, PlanInfo] = {
    "trial": PlanInfo(
        name="Trial",
        tier="trial",
        price_monthly=Decimal("0"),
        price_total=Decimal("0"),
        duration_days=7,
    ),
    "monthly": PlanInfo(
        name="Monthly",
        tier="monthly",
        price_monthly=Decimal("5.99"),
        price_total=Decimal("5.99"),
        duration_days=30,
    ),
    "quarterly": PlanInfo(
        name="Quarterly",
        tier="quarterly",
        price_monthly=Decimal("4.99"),
        price_total=Decimal("14.97"),
        duration_days=90,
    ),
    "yearly": PlanInfo(
        name="Yearly",
        tier="yearly",
        price_monthly=Decimal("3.99"),
        price_total=Decimal("47.88"),
        duration_days=365,
    ),
}


def get_plans() -> list[PlanInfo]:
    return [p for key, p in PLANS.items() if key != "trial"]


def verify_webhook_signature(body_bytes: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(), body_bytes, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def calculate_expiry(plan: str, current_expires_at: datetime | None = None) -> datetime:
    now = datetime.now(timezone.utc)
    plan_info = PLANS[plan]
    base = now
    if current_expires_at and current_expires_at > now:
        base = current_expires_at
    return base + timedelta(days=plan_info.duration_days)


async def create_payment_link(
    db: AsyncSession, user: User, plan: str
) -> tuple[Payment, str]:
    if plan not in PLANS or plan == "trial":
        raise ValueError(f"Invalid plan: {plan}")

    plan_info = PLANS[plan]
    payment = Payment(
        user_id=user.id,
        amount=plan_info.price_total,
        currency="RUB",
        status="pending",
        plan=plan,
    )
    payment.donatepay_comment = f"PLG:{payment.id}"
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    page_url = settings.donatepay_page_url or "https://new.donatepay.ru/@plgames"
    comment = quote(f"PLG:{payment.id}")
    payment_url = f"{page_url}?comment={comment}&sum={plan_info.price_total}"

    return payment, payment_url


async def process_webhook(
    db: AsyncSession, data: dict, signature: str | None = None
) -> Payment | None:
    if settings.donatepay_webhook_secret and signature:
        # In production, verify the signature
        # For now, we accept if secret is empty (dev mode)
        pass

    comment = data.get("comment", "")
    if not comment or not comment.startswith("PLG:"):
        return None

    payment_id_str = comment.replace("PLG:", "").strip()
    try:
        payment_id = uuid.UUID(payment_id_str)
    except ValueError:
        return None

    result = await db.execute(
        select(Payment).where(Payment.id == payment_id)
    )
    payment = result.scalar_one_or_none()
    if not payment or payment.status != "pending":
        return None

    payment.status = "completed"
    payment.donatepay_id = str(data.get("id", ""))

    # Get user
    user_result = await db.execute(
        select(User).where(User.id == payment.user_id)
    )
    user = user_result.scalar_one()

    # Create or extend subscription
    now = datetime.now(timezone.utc)
    expires_at = calculate_expiry(payment.plan, user.subscription_expires_at)

    subscription = Subscription(
        user_id=user.id,
        tier=payment.plan,
        plan=payment.plan,
        started_at=now,
        expires_at=expires_at,
        is_active=True,
    )
    db.add(subscription)
    await db.flush()

    payment.subscription_id = subscription.id

    # Update denormalized user fields
    user.subscription_tier = payment.plan
    user.subscription_expires_at = expires_at

    await db.commit()
    await db.refresh(payment)
    return payment


async def activate_trial(db: AsyncSession, user: User) -> Subscription:
    if user.trial_used:
        raise ValueError("Trial already used")

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=7)

    subscription = Subscription(
        user_id=user.id,
        tier="trial",
        plan="trial",
        started_at=now,
        expires_at=expires_at,
        is_active=True,
    )
    db.add(subscription)

    user.trial_used = True
    user.subscription_tier = "trial"
    user.subscription_expires_at = expires_at

    await db.commit()
    await db.refresh(subscription)
    return subscription


async def cancel_subscription(db: AsyncSession, user: User) -> Subscription | None:
    result = await db.execute(
        select(Subscription)
        .where(
            Subscription.user_id == user.id,
            Subscription.is_active == True,  # noqa: E712
        )
        .order_by(Subscription.expires_at.desc())
        .limit(1)
    )
    subscription = result.scalar_one_or_none()
    if not subscription:
        raise ValueError("No active subscription to cancel")

    now = datetime.now(timezone.utc)
    subscription.cancelled_at = now
    # Subscription remains active until expires_at

    await db.commit()
    await db.refresh(subscription)
    return subscription


async def get_active_subscription(
    db: AsyncSession, user_id: uuid.UUID
) -> Subscription | None:
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Subscription)
        .where(
            Subscription.user_id == user_id,
            Subscription.is_active == True,  # noqa: E712
            Subscription.expires_at > now,
        )
        .order_by(Subscription.expires_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_payment_history(
    db: AsyncSession, user_id: uuid.UUID
) -> list[Payment]:
    result = await db.execute(
        select(Payment)
        .where(Payment.user_id == user_id)
        .order_by(Payment.created_at.desc())
        .limit(50)
    )
    return list(result.scalars().all())
