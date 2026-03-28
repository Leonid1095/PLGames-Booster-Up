import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.promo_code import PromoCode
from app.models.user import User


@pytest.mark.asyncio
async def test_get_plans(client: AsyncClient):
    resp = await client.get("/api/billing/plans")
    assert resp.status_code == 200
    plans = resp.json()
    assert len(plans) == 3  # monthly, quarterly, yearly (no trial)
    slugs = {p["tier"] for p in plans}
    assert "monthly" in slugs
    assert "quarterly" in slugs
    assert "yearly" in slugs


@pytest.mark.asyncio
async def test_check_promo_valid(
    client: AsyncClient, auth_headers: dict, seed_promo: PromoCode
):
    resp = await client.post(
        "/api/billing/promo/check",
        json={"code": "TEST20", "plan": "monthly"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["discount_percent"] == 20


@pytest.mark.asyncio
async def test_check_promo_invalid(client: AsyncClient):
    resp = await client.post(
        "/api/billing/promo/check",
        json={"code": "INVALID", "plan": "monthly"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is False


@pytest.mark.asyncio
async def test_subscribe_requires_auth(client: AsyncClient):
    resp = await client.post(
        "/api/billing/subscribe",
        json={"plan": "monthly"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_subscribe_invalid_plan(client: AsyncClient, auth_headers: dict):
    resp = await client.post(
        "/api/billing/subscribe",
        json={"plan": "nonexistent"},
        headers=auth_headers,
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_trial_activation(client: AsyncClient, auth_headers: dict, test_user: User):
    resp = await client.post("/api/billing/trial", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["tier"] == "trial"
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_trial_double_activation(
    client: AsyncClient, auth_headers: dict, test_user: User
):
    await client.post("/api/billing/trial", headers=auth_headers)
    resp = await client.post("/api/billing/trial", headers=auth_headers)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_get_subscription(
    client: AsyncClient, auth_headers: dict, seed_subscription
):
    resp = await client.get("/api/billing/subscription", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["tier"] == "monthly"
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_payment_history(
    client: AsyncClient, auth_headers: dict, seed_payment
):
    resp = await client.get("/api/billing/payments", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert data[0]["plan"] == "monthly"


@pytest.mark.asyncio
async def test_cancel_subscription(
    client: AsyncClient, auth_headers: dict, seed_subscription
):
    resp = await client.post("/api/billing/cancel", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["cancelled_at"] is not None


@pytest.mark.asyncio
async def test_webhook_invalid_json(client: AsyncClient):
    resp = await client.post(
        "/api/billing/webhook",
        content=b"not json",
        headers={"content-type": "application/json"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_webhook_no_matching_payment(client: AsyncClient):
    resp = await client.post(
        "/api/billing/webhook",
        json={"comment": "PLG:00000000-0000-0000-0000-000000000000", "id": "123"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ignored"


@pytest.mark.asyncio
async def test_webhook_no_plg_comment(client: AsyncClient):
    resp = await client.post(
        "/api/billing/webhook",
        json={"comment": "some random comment", "id": "456"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "ignored"
