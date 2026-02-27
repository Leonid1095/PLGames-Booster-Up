from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.billing import (
    CreatePaymentRequest,
    PaymentHistoryItem,
    PaymentLinkResponse,
    PlanInfo,
    SubscriptionResponse,
)
from app.services import billing_service
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/billing", tags=["billing"])


@router.get("/plans", response_model=list[PlanInfo])
async def list_plans():
    return billing_service.get_plans()


@router.post("/subscribe", response_model=PaymentLinkResponse)
async def subscribe(
    body: CreatePaymentRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        payment, payment_url = await billing_service.create_payment_link(
            db, user, body.plan
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    return PaymentLinkResponse(
        payment_id=payment.id,
        payment_url=payment_url,
        amount=payment.amount,
        plan=payment.plan,
    )


@router.post("/trial", response_model=SubscriptionResponse)
async def activate_trial(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        sub = await billing_service.activate_trial(db, user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    now = datetime.now(timezone.utc)
    days = max(0, (sub.expires_at - now).days)
    return SubscriptionResponse(
        tier=sub.tier,
        plan=sub.plan,
        started_at=sub.started_at,
        expires_at=sub.expires_at,
        is_active=sub.is_active,
        cancelled_at=sub.cancelled_at,
        days_remaining=days,
    )


@router.post("/webhook")
async def donatepay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("X-Signature", "")

    try:
        data = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON"
        )

    payment = await billing_service.process_webhook(db, data, signature)
    if payment is None:
        return {"status": "ignored"}
    return {"status": "ok", "payment_id": str(payment.id)}


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sub = await billing_service.get_active_subscription(db, user.id)
    now = datetime.now(timezone.utc)
    if sub is None:
        return SubscriptionResponse(
            tier=user.subscription_tier or "free",
            plan="free",
            is_active=False,
            days_remaining=0,
        )
    days = max(0, (sub.expires_at - now).days)
    return SubscriptionResponse(
        tier=sub.tier,
        plan=sub.plan,
        started_at=sub.started_at,
        expires_at=sub.expires_at,
        is_active=sub.is_active,
        cancelled_at=sub.cancelled_at,
        days_remaining=days,
    )


@router.post("/cancel", response_model=SubscriptionResponse)
async def cancel_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        sub = await billing_service.cancel_subscription(db, user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    now = datetime.now(timezone.utc)
    days = max(0, (sub.expires_at - now).days)
    return SubscriptionResponse(
        tier=sub.tier,
        plan=sub.plan,
        started_at=sub.started_at,
        expires_at=sub.expires_at,
        is_active=sub.is_active,
        cancelled_at=sub.cancelled_at,
        days_remaining=days,
    )


@router.get("/payments", response_model=list[PaymentHistoryItem])
async def payment_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payments = await billing_service.get_payment_history(db, user.id)
    return [
        PaymentHistoryItem(
            id=p.id,
            amount=p.amount,
            currency=p.currency,
            status=p.status,
            plan=p.plan,
            created_at=p.created_at,
        )
        for p in payments
    ]
