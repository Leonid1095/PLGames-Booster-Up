import asyncio
import uuid
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.database import get_db
from app.main import app
from app.models import Base
from app.models.game_profile import GameProfile
from app.models.node import Node
from app.models.user import User
from app.services.auth_service import create_access_token, hash_password

TEST_DB_URL = settings.database_url.replace("/plgames", "/plgames_test")


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def engine():
    # Create test database tables
    eng = create_async_engine(TEST_DB_URL, echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest_asyncio.fixture
async def db_session(engine):
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(engine):
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession):
    user = User(
        email="fixture@test.com",
        username="fixtureuser",
        password_hash=hash_password("testpass123"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(test_user: User):
    token = create_access_token(str(test_user.id))
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def seed_games(db_session: AsyncSession):
    games = [
        GameProfile(
            name="Counter-Strike 2",
            slug="cs2",
            exe_names=["cs2.exe"],
            server_ips=["155.133.232.0/23"],
            ports=["27015-27050"],
            protocol="UDP",
            category="fps",
            is_popular=True,
        ),
        GameProfile(
            name="Dota 2",
            slug="dota-2",
            exe_names=["dota2.exe"],
            server_ips=["155.133.232.0/23"],
            ports=["27015-27050"],
            protocol="UDP",
            category="moba",
            is_popular=True,
        ),
        GameProfile(
            name="Valorant",
            slug="valorant",
            exe_names=["VALORANT.exe"],
            server_ips=["162.249.72.0/22"],
            ports=["7000-8000"],
            protocol="UDP",
            category="fps",
            is_popular=False,
        ),
    ]
    for g in games:
        db_session.add(g)
    await db_session.commit()
    return games


@pytest_asyncio.fixture
async def seed_node(db_session: AsyncSession):
    node = Node(
        name="Test Frankfurt",
        location="DE",
        city="Frankfurt",
        ip_address="93.183.70.55",
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
