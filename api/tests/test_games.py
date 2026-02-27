import pytest


@pytest.mark.asyncio
async def test_list_games(client, seed_games):
    resp = await client.get("/api/games")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 3
    assert len(data["items"]) >= 3


@pytest.mark.asyncio
async def test_search_games(client, seed_games):
    resp = await client.get("/api/games/search", params={"q": "Counter"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert any("Counter" in g["name"] for g in data["items"])


@pytest.mark.asyncio
async def test_get_game_by_slug(client, seed_games):
    resp = await client.get("/api/games/cs2")
    assert resp.status_code == 200
    data = resp.json()
    assert data["slug"] == "cs2"
    assert data["name"] == "Counter-Strike 2"


@pytest.mark.asyncio
async def test_get_game_not_found(client):
    resp = await client.get("/api/games/nonexistent-game")
    assert resp.status_code == 404
