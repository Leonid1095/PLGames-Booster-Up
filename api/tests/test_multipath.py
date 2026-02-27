"""Tests for Phase 9: Multipath session support."""
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.node import Node
from app.models.session import Session


# --- Fixtures ---

@pytest_asyncio.fixture
async def second_node(db_session: AsyncSession):
    """A second node in a different location for multipath testing."""
    node = Node(
        name="Test Stockholm",
        location="SE",
        city="Stockholm",
        ip_address="185.199.110.10",
        status="active",
        current_load=0,
        max_sessions=1000,
        relay_port=443,
        relay_api_port=8443,
    )
    db_session.add(node)
    await db_session.commit()
    await db_session.refresh(node)
    return node


@pytest_asyncio.fixture
async def same_location_node(db_session: AsyncSession):
    """A second node in the same location (DE) for fallback testing."""
    node = Node(
        name="Test Frankfurt 2",
        location="DE",
        city="Frankfurt",
        ip_address="93.183.70.56",
        status="active",
        current_load=0,
        max_sessions=1000,
        relay_port=443,
        relay_api_port=8443,
    )
    db_session.add(node)
    await db_session.commit()
    await db_session.refresh(node)
    return node


# --- Tests ---

@pytest.mark.asyncio
@patch("app.services.session_service.register_session_on_relay", new_callable=AsyncMock, return_value=True)
async def test_start_without_multipath(mock_relay, client, auth_headers, seed_games, seed_node):
    """Start session without multipath — backup fields should be None/False."""
    resp = await client.post(
        "/api/sessions/start",
        json={"game_slug": "cs2", "node_id": str(seed_node.id)},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["backup_node_ip"] is None
    assert data["backup_node_port"] is None
    assert data["multipath_enabled"] is False
    assert mock_relay.call_count == 1  # only primary


@pytest.mark.asyncio
@patch("app.services.session_service.register_session_on_relay", new_callable=AsyncMock, return_value=True)
async def test_start_with_multipath_two_nodes(mock_relay, client, auth_headers, seed_games, seed_node, second_node):
    """Start session with multipath=true and 2 nodes — backup should be filled."""
    resp = await client.post(
        "/api/sessions/start",
        json={"game_slug": "cs2", "node_id": str(seed_node.id), "multipath": True},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["multipath_enabled"] is True
    assert data["backup_node_ip"] == second_node.ip_address
    assert data["backup_node_port"] == second_node.relay_port
    assert mock_relay.call_count == 2  # primary + backup


@pytest.mark.asyncio
@patch("app.services.session_service.register_session_on_relay", new_callable=AsyncMock, return_value=True)
async def test_backup_differs_from_primary(mock_relay, client, auth_headers, seed_games, seed_node, second_node):
    """Backup node must differ from primary."""
    resp = await client.post(
        "/api/sessions/start",
        json={"game_slug": "cs2", "node_id": str(seed_node.id), "multipath": True},
        headers=auth_headers,
    )
    data = resp.json()
    assert data["backup_node_ip"] != data["node_ip"]


@pytest.mark.asyncio
@patch("app.services.session_service.register_session_on_relay", new_callable=AsyncMock, return_value=True)
async def test_backup_prefers_different_location(mock_relay, client, auth_headers, seed_games, seed_node, second_node, same_location_node):
    """With nodes in DE and SE, backup should pick SE (different location)."""
    resp = await client.post(
        "/api/sessions/start",
        json={"game_slug": "cs2", "node_id": str(seed_node.id), "multipath": True},
        headers=auth_headers,
    )
    data = resp.json()
    assert data["multipath_enabled"] is True
    # Should pick SE node, not DE node
    assert data["backup_node_ip"] == second_node.ip_address


@pytest.mark.asyncio
@patch("app.services.session_service.register_session_on_relay", new_callable=AsyncMock, return_value=True)
async def test_backup_fallback_same_location(mock_relay, client, auth_headers, seed_games, seed_node, same_location_node):
    """When all nodes share location, pick any other as backup."""
    resp = await client.post(
        "/api/sessions/start",
        json={"game_slug": "cs2", "node_id": str(seed_node.id), "multipath": True},
        headers=auth_headers,
    )
    data = resp.json()
    assert data["multipath_enabled"] is True
    assert data["backup_node_ip"] == same_location_node.ip_address


@pytest.mark.asyncio
@patch("app.services.session_service.register_session_on_relay", new_callable=AsyncMock, return_value=True)
async def test_multipath_single_node_fallback(mock_relay, client, auth_headers, seed_games, seed_node):
    """Multipath with only 1 node — graceful fallback to single-path."""
    resp = await client.post(
        "/api/sessions/start",
        json={"game_slug": "cs2", "node_id": str(seed_node.id), "multipath": True},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["multipath_enabled"] is False
    assert data["backup_node_ip"] is None
    assert mock_relay.call_count == 1  # only primary


@pytest.mark.asyncio
@patch("app.services.session_service.unregister_session_on_relay", new_callable=AsyncMock, return_value=True)
@patch("app.services.session_service.register_session_on_relay", new_callable=AsyncMock, return_value=True)
async def test_stop_multipath_session(mock_register, mock_unregister, client, auth_headers, seed_games, seed_node, second_node):
    """Stop multipath session — should unregister from both relays."""
    # Start
    resp = await client.post(
        "/api/sessions/start",
        json={"game_slug": "cs2", "node_id": str(seed_node.id), "multipath": True},
        headers=auth_headers,
    )
    session_id = resp.json()["session_id"]

    # Stop
    resp = await client.post(
        f"/api/sessions/{session_id}/stop",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "stopped"
    assert mock_unregister.call_count == 2  # primary + backup


@pytest.mark.asyncio
@patch("app.services.session_service.unregister_session_on_relay", new_callable=AsyncMock, return_value=True)
@patch("app.services.session_service.register_session_on_relay", new_callable=AsyncMock, return_value=True)
async def test_stop_single_path_session(mock_register, mock_unregister, client, auth_headers, seed_games, seed_node):
    """Stop single-path session — should unregister from primary only."""
    resp = await client.post(
        "/api/sessions/start",
        json={"game_slug": "cs2", "node_id": str(seed_node.id)},
        headers=auth_headers,
    )
    session_id = resp.json()["session_id"]

    resp = await client.post(
        f"/api/sessions/{session_id}/stop",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert mock_unregister.call_count == 1


@pytest.mark.asyncio
@patch("app.services.session_service.register_session_on_relay", new_callable=AsyncMock, return_value=True)
async def test_session_history_shows_multipath(mock_relay, client, auth_headers, seed_games, seed_node, second_node):
    """Session history should include multipath_enabled field."""
    # Start multipath session
    await client.post(
        "/api/sessions/start",
        json={"game_slug": "cs2", "node_id": str(seed_node.id), "multipath": True},
        headers=auth_headers,
    )

    resp = await client.get("/api/sessions/history", headers=auth_headers)
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    assert items[0]["multipath_enabled"] is True


@pytest.mark.asyncio
@patch("app.services.session_service.register_session_on_relay", new_callable=AsyncMock, return_value=True)
async def test_session_history_single_path(mock_relay, client, auth_headers, seed_games, seed_node):
    """Session history for single-path shows multipath_enabled=False."""
    await client.post(
        "/api/sessions/start",
        json={"game_slug": "cs2", "node_id": str(seed_node.id)},
        headers=auth_headers,
    )

    resp = await client.get("/api/sessions/history", headers=auth_headers)
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    assert items[0]["multipath_enabled"] is False


@pytest.mark.asyncio
@patch("app.services.session_service.register_session_on_relay", new_callable=AsyncMock, return_value=True)
async def test_admin_sees_multipath_fields(mock_relay, client, auth_headers, admin_headers, seed_games, seed_node, second_node):
    """Admin session list should include backup_node_id and multipath_enabled."""
    # Start multipath session as regular user
    await client.post(
        "/api/sessions/start",
        json={"game_slug": "cs2", "node_id": str(seed_node.id), "multipath": True},
        headers=auth_headers,
    )

    # Admin queries sessions
    resp = await client.get("/api/admin/sessions", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    sessions = data["items"]
    assert len(sessions) >= 1
    s = sessions[0]
    assert s["multipath_enabled"] is True
    assert s["backup_node_id"] is not None
    assert s["backup_node_id"] == str(second_node.id)


@pytest.mark.asyncio
@patch("app.services.session_service.register_session_on_relay", new_callable=AsyncMock, return_value=True)
async def test_multipath_db_fields_stored(mock_relay, client, auth_headers, seed_games, seed_node, second_node, db_session):
    """Verify multipath fields are persisted in the database."""
    resp = await client.post(
        "/api/sessions/start",
        json={"game_slug": "cs2", "node_id": str(seed_node.id), "multipath": True},
        headers=auth_headers,
    )
    session_id = resp.json()["session_id"]

    result = await db_session.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one()
    assert session.multipath_enabled is True
    assert session.backup_node_id == second_node.id
