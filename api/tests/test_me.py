import pytest


@pytest.mark.asyncio
async def test_get_me(client, auth_headers, test_user):
    resp = await client.get("/api/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == test_user.email
    assert data["username"] == test_user.username


@pytest.mark.asyncio
async def test_get_me_stats(client, auth_headers, test_user):
    resp = await client.get("/api/me/stats", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_sessions" in data
    assert "total_bytes_sent" in data


@pytest.mark.asyncio
async def test_me_unauthenticated(client):
    resp = await client.get("/api/me")
    assert resp.status_code == 403
