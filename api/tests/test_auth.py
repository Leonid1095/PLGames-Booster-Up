import pytest


@pytest.mark.asyncio
async def test_register(client):
    resp = await client.post("/api/auth/register", json={
        "email": "new@test.com",
        "username": "newuser",
        "password": "testpass123",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    # Register first
    await client.post("/api/auth/register", json={
        "email": "dup@test.com",
        "username": "dupuser1",
        "password": "testpass123",
    })
    # Try duplicate
    resp = await client.post("/api/auth/register", json={
        "email": "dup@test.com",
        "username": "dupuser2",
        "password": "testpass123",
    })
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client):
    # Register
    await client.post("/api/auth/register", json={
        "email": "login@test.com",
        "username": "loginuser",
        "password": "testpass123",
    })
    # Login
    resp = await client.post("/api/auth/login", json={
        "email": "login@test.com",
        "password": "testpass123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    # Register
    await client.post("/api/auth/register", json={
        "email": "wrongpw@test.com",
        "username": "wrongpwuser",
        "password": "testpass123",
    })
    # Wrong password
    resp = await client.post("/api/auth/login", json={
        "email": "wrongpw@test.com",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(client):
    # Register to get tokens
    reg_resp = await client.post("/api/auth/register", json={
        "email": "refresh@test.com",
        "username": "refreshuser",
        "password": "testpass123",
    })
    refresh_token = reg_resp.json()["refresh_token"]

    # Refresh
    resp = await client.post("/api/auth/refresh", json={
        "refresh_token": refresh_token,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
