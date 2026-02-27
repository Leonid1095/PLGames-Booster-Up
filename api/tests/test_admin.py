import pytest


# ──────────────── Auth / Access ────────────────


@pytest.mark.asyncio
async def test_admin_requires_auth(client):
    resp = await client.get("/api/admin/stats")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_non_admin_forbidden(client, auth_headers):
    resp = await client.get("/api/admin/stats", headers=auth_headers)
    assert resp.status_code == 403


# ──────────────── Stats ────────────────


@pytest.mark.asyncio
async def test_admin_stats(client, admin_headers, test_user):
    resp = await client.get("/api/admin/stats", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_users" in data
    assert "active_subscriptions" in data
    assert "active_sessions" in data
    assert "revenue_30d" in data
    assert data["total_users"] >= 2  # admin + test_user


# ──────────────── Users ────────────────


@pytest.mark.asyncio
async def test_admin_list_users(client, admin_headers, test_user):
    resp = await client.get("/api/admin/users", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 2
    assert data["page"] == 1
    assert data["per_page"] == 20
    assert data["pages"] >= 1
    assert len(data["items"]) >= 2


@pytest.mark.asyncio
async def test_admin_list_users_search(client, admin_headers, test_user):
    resp = await client.get("/api/admin/users", params={"search": "fixture"}, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert any(u["username"] == "fixtureuser" for u in data["items"])


@pytest.mark.asyncio
async def test_admin_list_users_pagination(client, admin_headers, test_user):
    resp = await client.get("/api/admin/users", params={"page": 1, "per_page": 1}, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 1
    assert data["per_page"] == 1
    assert data["pages"] >= 2


@pytest.mark.asyncio
async def test_admin_get_user(client, admin_headers, test_user):
    resp = await client.get(f"/api/admin/users/{test_user.id}", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "fixture@test.com"
    assert data["username"] == "fixtureuser"
    assert "is_admin" in data
    assert "trial_used" in data


@pytest.mark.asyncio
async def test_admin_get_user_not_found(client, admin_headers):
    resp = await client.get("/api/admin/users/00000000-0000-0000-0000-000000000000", headers=admin_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_admin_update_user(client, admin_headers, test_user):
    resp = await client.patch(
        f"/api/admin/users/{test_user.id}",
        json={"subscription_tier": "yearly", "is_admin": True},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["subscription_tier"] == "yearly"
    assert data["is_admin"] is True


# ──────────────── Nodes ────────────────


@pytest.mark.asyncio
async def test_admin_create_node(client, admin_headers):
    resp = await client.post("/api/admin/nodes", json={
        "name": "Stockholm Node",
        "location": "SE",
        "city": "Stockholm",
        "ip_address": "10.0.0.1",
        "max_sessions": 500,
    }, headers=admin_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Stockholm Node"
    assert data["location"] == "SE"
    assert data["status"] == "active"
    assert data["relay_port"] == 443


@pytest.mark.asyncio
async def test_admin_list_nodes(client, admin_headers, seed_node):
    resp = await client.get("/api/admin/nodes", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert any(n["name"] == "Test Frankfurt" for n in data)


@pytest.mark.asyncio
async def test_admin_update_node(client, admin_headers, seed_node):
    resp = await client.patch(
        f"/api/admin/nodes/{seed_node.id}",
        json={"name": "Frankfurt Updated", "max_sessions": 2000},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Frankfurt Updated"
    assert data["max_sessions"] == 2000


@pytest.mark.asyncio
async def test_admin_delete_node(client, admin_headers, seed_node):
    resp = await client.delete(f"/api/admin/nodes/{seed_node.id}", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "inactive"


# ──────────────── Games ────────────────


@pytest.mark.asyncio
async def test_admin_create_game(client, admin_headers):
    resp = await client.post("/api/admin/games", json={
        "name": "Apex Legends",
        "slug": "apex-legends",
        "exe_names": ["r5apex.exe"],
        "server_ips": ["10.0.0.0/8"],
        "ports": ["37015-37020"],
        "protocol": "UDP",
        "category": "fps",
        "is_popular": True,
    }, headers=admin_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Apex Legends"
    assert data["slug"] == "apex-legends"
    assert data["is_popular"] is True


@pytest.mark.asyncio
async def test_admin_create_game_duplicate_slug(client, admin_headers, seed_games):
    resp = await client.post("/api/admin/games", json={
        "name": "CS2 Duplicate",
        "slug": "cs2",
    }, headers=admin_headers)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_admin_list_games(client, admin_headers, seed_games):
    resp = await client.get("/api/admin/games", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 3


@pytest.mark.asyncio
async def test_admin_update_game(client, admin_headers, seed_games):
    game_id = seed_games[0].id
    resp = await client.patch(
        f"/api/admin/games/{game_id}",
        json={"is_popular": False, "category": "tactical"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_popular"] is False
    assert data["category"] == "tactical"


@pytest.mark.asyncio
async def test_admin_delete_game(client, admin_headers, seed_games):
    game_id = seed_games[2].id  # Valorant
    resp = await client.delete(f"/api/admin/games/{game_id}", headers=admin_headers)
    assert resp.status_code == 204


# ──────────────── Sessions ────────────────


@pytest.mark.asyncio
async def test_admin_list_sessions_empty(client, admin_headers):
    resp = await client.get("/api/admin/sessions", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_admin_list_sessions_with_data(client, admin_headers, auth_headers, seed_games, seed_node):
    # Create a session via the regular API
    await client.post("/api/sessions/start", json={
        "game_slug": "cs2",
        "node_id": str(seed_node.id),
    }, headers=auth_headers)

    resp = await client.get("/api/admin/sessions", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_admin_list_sessions_filter_status(client, admin_headers, auth_headers, seed_games, seed_node):
    await client.post("/api/sessions/start", json={
        "game_slug": "cs2",
        "node_id": str(seed_node.id),
    }, headers=auth_headers)

    resp = await client.get("/api/admin/sessions", params={"status": "active"}, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert all(s["status"] == "active" for s in data["items"])


@pytest.mark.asyncio
async def test_admin_get_session(client, admin_headers, auth_headers, seed_games, seed_node):
    start_resp = await client.post("/api/sessions/start", json={
        "game_slug": "cs2",
        "node_id": str(seed_node.id),
    }, headers=auth_headers)
    session_id = start_resp.json()["session_id"]

    resp = await client.get(f"/api/admin/sessions/{session_id}", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == session_id
    assert data["status"] == "active"


@pytest.mark.asyncio
async def test_admin_stop_session(client, admin_headers, auth_headers, seed_games, seed_node):
    start_resp = await client.post("/api/sessions/start", json={
        "game_slug": "cs2",
        "node_id": str(seed_node.id),
    }, headers=auth_headers)
    session_id = start_resp.json()["session_id"]

    resp = await client.post(f"/api/admin/sessions/{session_id}/stop", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "stopped"
    assert data["ended_at"] is not None


@pytest.mark.asyncio
async def test_admin_stop_already_stopped(client, admin_headers, auth_headers, seed_games, seed_node):
    start_resp = await client.post("/api/sessions/start", json={
        "game_slug": "cs2",
        "node_id": str(seed_node.id),
    }, headers=auth_headers)
    session_id = start_resp.json()["session_id"]

    await client.post(f"/api/admin/sessions/{session_id}/stop", headers=admin_headers)
    resp = await client.post(f"/api/admin/sessions/{session_id}/stop", headers=admin_headers)
    assert resp.status_code == 400


# ──────────────── Subscriptions ────────────────


@pytest.mark.asyncio
async def test_admin_list_subscriptions(client, admin_headers, seed_subscription):
    resp = await client.get("/api/admin/subscriptions", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert data["items"][0]["tier"] == "monthly"


@pytest.mark.asyncio
async def test_admin_update_subscription(client, admin_headers, seed_subscription):
    resp = await client.patch(
        f"/api/admin/subscriptions/{seed_subscription.id}",
        json={"tier": "yearly", "is_active": False},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["tier"] == "yearly"
    assert data["is_active"] is False


@pytest.mark.asyncio
async def test_admin_update_subscription_not_found(client, admin_headers):
    resp = await client.patch(
        "/api/admin/subscriptions/00000000-0000-0000-0000-000000000000",
        json={"tier": "yearly"},
        headers=admin_headers,
    )
    assert resp.status_code == 404


# ──────────────── Payments ────────────────


@pytest.mark.asyncio
async def test_admin_list_payments(client, admin_headers, seed_payment):
    resp = await client.get("/api/admin/payments", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert data["items"][0]["status"] == "completed"
    assert data["items"][0]["plan"] == "monthly"


@pytest.mark.asyncio
async def test_admin_list_payments_filter_status(client, admin_headers, seed_payment):
    resp = await client.get("/api/admin/payments", params={"status": "pending"}, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_admin_list_payments_filter_user(client, admin_headers, seed_payment, test_user):
    resp = await client.get(
        "/api/admin/payments",
        params={"user_id": str(test_user.id)},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1


# ──────────────── Promos ────────────────


@pytest.mark.asyncio
async def test_admin_create_promo(client, admin_headers):
    resp = await client.post("/api/admin/promos", json={
        "code": "NEWPROMO50",
        "discount_percent": 50,
        "max_uses": 10,
        "applicable_plans": "monthly,yearly",
    }, headers=admin_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["code"] == "NEWPROMO50"
    assert data["discount_percent"] == 50
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_admin_create_promo_duplicate(client, admin_headers, seed_promo):
    resp = await client.post("/api/admin/promos", json={
        "code": "TEST20",
        "discount_percent": 10,
    }, headers=admin_headers)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_admin_list_promos(client, admin_headers, seed_promo):
    resp = await client.get("/api/admin/promos", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert any(p["code"] == "TEST20" for p in data)


@pytest.mark.asyncio
async def test_admin_update_promo(client, admin_headers, seed_promo):
    resp = await client.patch(
        f"/api/admin/promos/{seed_promo.id}",
        json={"discount_percent": 30, "max_uses": 200},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["discount_percent"] == 30
    assert data["max_uses"] == 200


@pytest.mark.asyncio
async def test_admin_delete_promo(client, admin_headers, seed_promo):
    resp = await client.delete(f"/api/admin/promos/{seed_promo.id}", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_active"] is False
