import pytest


@pytest.mark.asyncio
async def test_start_session(client, auth_headers, seed_games, seed_node):
    resp = await client.post("/api/sessions/start", json={
        "game_slug": "cs2",
        "node_id": str(seed_node.id),
    }, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert "session_id" in data
    assert "session_token" in data
    assert data["status"] == "active"


@pytest.mark.asyncio
async def test_stop_session(client, auth_headers, seed_games, seed_node):
    # Start a session first
    start_resp = await client.post("/api/sessions/start", json={
        "game_slug": "dota-2",
        "node_id": str(seed_node.id),
    }, headers=auth_headers)
    session_id = start_resp.json()["session_id"]

    # Stop it
    resp = await client.post(f"/api/sessions/{session_id}/stop", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "stopped"


@pytest.mark.asyncio
async def test_session_history(client, auth_headers):
    resp = await client.get("/api/sessions/history", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_session_unauthenticated(client):
    resp = await client.post("/api/sessions/start", json={
        "game_slug": "cs2",
        "node_id": "00000000-0000-0000-0000-000000000000",
    })
    assert resp.status_code == 403
