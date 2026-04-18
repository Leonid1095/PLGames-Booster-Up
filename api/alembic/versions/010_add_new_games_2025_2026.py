"""010_add_new_games_2025_2026

Add new games released in 2025-2026.

Revision ID: a1b2c3d4e5f6
Revises: f6a7b8c9d0e1
Create Date: 2026-04-18 12:00:00.000000

"""
import uuid
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "g7h8i9j0k1l2"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_S = "https://cdn.cloudflare.steamstatic.com/steam/apps"

NEW_GAMES = [
    {"name": "Arena Breakout: Infinite", "slug": "arena-breakout-infinite", "exe_names": ["ArenaBreakoutInfinite.exe", "ABI-Win64-Shipping.exe"], "server_ips": ["47.236.0.0/15"], "ports": ["17000-17200"], "protocol": "UDP", "category": "fps", "is_popular": True, "icon_url": f"{_S}/2950760/header.jpg"},
    {"name": "Fragpunk", "slug": "fragpunk", "exe_names": ["Fragpunk.exe", "Fragpunk-Win64-Shipping.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["27015-27050"], "protocol": "UDP", "category": "fps", "is_popular": True, "icon_url": f"{_S}/2694490/header.jpg"},
    {"name": "Strinova", "slug": "strinova", "exe_names": ["Strinova.exe", "Strinova-Win64-Shipping.exe"], "server_ips": ["47.236.0.0/15"], "ports": ["27015-27050"], "protocol": "UDP", "category": "fps", "is_popular": False, "icon_url": f"{_S}/2669320/header.jpg"},
    {"name": "Once Human", "slug": "once-human", "exe_names": ["OnceHuman.exe", "OnceHuman-Win64-Shipping.exe"], "server_ips": ["47.236.0.0/15"], "ports": ["27015-27050"], "protocol": "UDP", "category": "survival", "is_popular": False, "icon_url": f"{_S}/2139460/header.jpg"},
    {"name": "Spectre Divide", "slug": "spectre-divide", "exe_names": ["SpectreClient.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["27015-27050"], "protocol": "UDP", "category": "fps", "is_popular": False, "icon_url": f"{_S}/2246340/header.jpg"},
    {"name": "Supervive", "slug": "supervive", "exe_names": ["Supervive.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["27015-27050"], "protocol": "UDP", "category": "moba", "is_popular": False, "icon_url": f"{_S}/1283700/header.jpg"},
    {"name": "inZOI", "slug": "inzoi", "exe_names": ["inZOI.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["27015-27050"], "protocol": "UDP", "category": "mmo", "is_popular": False, "icon_url": f"{_S}/2456740/header.jpg"},
]


def upgrade() -> None:
    game_profiles = sa.table(
        "game_profiles",
        sa.column("id", sa.Uuid),
        sa.column("name", sa.String),
        sa.column("slug", sa.String),
        sa.column("exe_names", sa.ARRAY(sa.String)),
        sa.column("server_ips", sa.ARRAY(sa.String)),
        sa.column("ports", sa.ARRAY(sa.String)),
        sa.column("protocol", sa.String),
        sa.column("category", sa.String),
        sa.column("is_popular", sa.Boolean),
        sa.column("icon_url", sa.String),
        sa.column("created_at", sa.DateTime),
        sa.column("updated_at", sa.DateTime),
    )

    now = datetime.now(timezone.utc)
    for game in NEW_GAMES:
        op.execute(
            game_profiles.insert().values(
                id=uuid.uuid4(),
                name=game["name"],
                slug=game["slug"],
                exe_names=game["exe_names"],
                server_ips=game["server_ips"],
                ports=game["ports"],
                protocol=game["protocol"],
                category=game["category"],
                is_popular=game["is_popular"],
                icon_url=game["icon_url"],
                created_at=now,
                updated_at=now,
            )
        )


def downgrade() -> None:
    slugs = [g["slug"] for g in NEW_GAMES]
    op.execute(
        sa.text("DELETE FROM game_profiles WHERE slug = ANY(:slugs)"),
        {"slugs": slugs},
    )
