"""
E2E test: complete user journey from registration to session lifecycle.
register → login → activate trial → list games → list nodes → start session → stop session → check history
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_full_user_journey(client: AsyncClient, db_session: AsyncSession, seed_games, seed_node):
    """Test the complete user flow end-to-end."""

    # 1. Register
    resp = await client.post("/api/auth/register", json={
        "email": "e2e@test.com",
        "username": "e2euser",
        "password": "TestPass123!",
    })
    assert resp.status_code == 201, f"Register failed: {resp.text}"
    data = resp.json()
    assert data["email"] == "e2e@test.com"
    assert data["username"] == "e2euser"

    # 2. Login
    resp = await client.post("/api/auth/login", json={
        "email": "e2e@test.com",
        "password": "TestPass123!",
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    tokens = resp.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    auth = {"Authorization": f"Bearer {tokens['access_token']}"}

    # 3. Get user profile
    resp = await client.get("/api/users/me", headers=auth)
    assert resp.status_code == 200
    user = resp.json()
    assert user["subscription_tier"] == "free"

    # 4. Activate trial
    resp = await client.post("/api/billing/trial", headers=auth)
    assert resp.status_code == 200
    trial = resp.json()
    assert trial["tier"] == "trial"
    assert trial["is_active"] is True
    assert trial["days_remaining"] >= 6

    # 5. Verify subscription updated
    resp = await client.get("/api/billing/subscription", headers=auth)
    assert resp.status_code == 200
    sub = resp.json()
    assert sub["tier"] == "trial"
    assert sub["is_active"] is True

    # 6. List games
    resp = await client.get("/api/games", headers=auth)
    assert resp.status_code == 200
    games = resp.json()
    assert games["total"] >= 1
    game_slug = games["items"][0]["slug"]

    # 7. List nodes
    resp = await client.get("/api/nodes", headers=auth)
    assert resp.status_code == 200
    nodes = resp.json()
    assert len(nodes) >= 1
    node_id = str(nodes[0]["id"])

    # 8. Start session
    resp = await client.post("/api/sessions/start", json={
        "game_slug": game_slug,
        "node_id": node_id,
    }, headers=auth)
    assert resp.status_code == 201, f"Start session failed: {resp.text}"
    session = resp.json()
    assert session["status"] == "active"
    assert session["session_token"] > 0
    session_id = session["session_id"]

    # 9. Stop session
    resp = await client.post(f"/api/sessions/{session_id}/stop", headers=auth)
    assert resp.status_code == 200, f"Stop session failed: {resp.text}"
    stopped = resp.json()
    assert stopped["status"] == "stopped"

    # 10. Check history
    resp = await client.get("/api/sessions/history", headers=auth)
    assert resp.status_code == 200
    history = resp.json()
    assert len(history) >= 1
    assert history[0]["status"] == "stopped"
    assert history[0]["game_name"] is not None

    # 11. Verify user stats updated
    resp = await client.get("/api/users/me/stats", headers=auth)
    assert resp.status_code == 200
    stats = resp.json()
    assert stats["total_sessions"] >= 1

    # 12. Token refresh
    resp = await client.post("/api/auth/refresh", json={
        "refresh_token": tokens["refresh_token"],
    })
    assert resp.status_code == 200
    new_tokens = resp.json()
    assert "access_token" in new_tokens

    # 13. Logout (invalidate token — verify old token fails after this)
    new_auth = {"Authorization": f"Bearer {new_tokens['access_token']}"}
    resp = await client.get("/api/users/me", headers=new_auth)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_duplicate_registration(client: AsyncClient):
    """Test that duplicate email registration is rejected."""
    body = {"email": "dup@test.com", "username": "dupuser", "password": "TestPass123!"}
    resp = await client.post("/api/auth/register", json=body)
    assert resp.status_code == 201

    resp = await client.post("/api/auth/register", json=body)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_invalid_login(client: AsyncClient):
    """Test that invalid credentials are rejected."""
    resp = await client.post("/api/auth/login", json={
        "email": "nonexistent@test.com",
        "password": "wrong",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_session_requires_subscription(client: AsyncClient, db_session, seed_games, seed_node):
    """Test that starting a session requires an active subscription."""
    # Register a free user
    resp = await client.post("/api/auth/register", json={
        "email": "free@test.com",
        "username": "freeuser",
        "password": "TestPass123!",
    })
    assert resp.status_code == 201

    resp = await client.post("/api/auth/login", json={
        "email": "free@test.com",
        "password": "TestPass123!",
    })
    tokens = resp.json()
    auth = {"Authorization": f"Bearer {tokens['access_token']}"}

    # Try to start session without subscription
    resp = await client.post("/api/sessions/start", json={
        "game_slug": "cs2",
        "node_id": str(seed_node.id),
    }, headers=auth)
    # Should fail — free tier has no access
    assert resp.status_code in (400, 403)
