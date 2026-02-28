"""008_game_icons_and_new_games

Add icon_url column to game_profiles, populate icons, add new games.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-02-28 12:00:00.000000

"""
import uuid
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_S = "https://cdn.cloudflare.steamstatic.com/steam/apps"

# slug → icon_url for existing games
ICON_MAP = {
    "cs2": f"{_S}/730/header.jpg",
    "valorant": "https://media.valorant-api.com/agents/banner.png",
    "overwatch-2": f"{_S}/2357570/header.jpg",
    "apex-legends": f"{_S}/1172470/header.jpg",
    "cod-warzone": f"{_S}/1962663/header.jpg",
    "rainbow-six-siege": f"{_S}/359550/header.jpg",
    "tf2": f"{_S}/440/header.jpg",
    "battlefield-2042": f"{_S}/1517290/header.jpg",
    "hunt-showdown": f"{_S}/594650/header.jpg",
    "the-finals": f"{_S}/2073850/header.jpg",
    "deadlock": f"{_S}/1422450/header.jpg",
    "halo-infinite": f"{_S}/1240440/header.jpg",
    "csgo": f"{_S}/730/header.jpg",
    "destiny-2": f"{_S}/1085660/header.jpg",
    "dota-2": f"{_S}/570/header.jpg",
    "smite-2": f"{_S}/2404080/header.jpg",
    "pubg": f"{_S}/578080/header.jpg",
    "naraka-bladepoint": f"{_S}/1203220/header.jpg",
    "ffxiv": f"{_S}/39210/header.jpg",
    "lost-ark": f"{_S}/1599340/header.jpg",
    "new-world": f"{_S}/1063730/header.jpg",
    "guild-wars-2": f"{_S}/1284210/header.jpg",
    "elder-scrolls-online": f"{_S}/306130/header.jpg",
    "path-of-exile-2": f"{_S}/2694490/header.jpg",
    "diablo-iv": f"{_S}/2344520/header.jpg",
    "throne-and-liberty": f"{_S}/2429640/header.jpg",
    "albion-online": f"{_S}/761890/header.jpg",
    "rocket-league": f"{_S}/252950/header.jpg",
    "ea-fc-25": f"{_S}/2669320/header.jpg",
    "assetto-corsa-competizione": f"{_S}/805550/header.jpg",
    "rust": f"{_S}/252490/header.jpg",
    "ark-survival-ascended": f"{_S}/2399830/header.jpg",
    "dayz": f"{_S}/221100/header.jpg",
    "7-days-to-die": f"{_S}/251570/header.jpg",
    "palworld": f"{_S}/1623730/header.jpg",
    "age-of-empires-iv": f"{_S}/1466860/header.jpg",
    "street-fighter-6": f"{_S}/1364780/header.jpg",
    "tekken-8": f"{_S}/1778820/header.jpg",
    "mortal-kombat-1": f"{_S}/1971870/header.jpg",
    "war-thunder": f"{_S}/236390/header.jpg",
}

# New games to insert
NEW_GAMES = [
    {"name": "Marvel Rivals", "slug": "marvel-rivals", "exe_names": ["MarvelRivals_Launcher.exe", "MarvelRivals.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["27015-27050"], "protocol": "UDP", "category": "fps", "is_popular": True, "icon_url": f"{_S}/2767030/header.jpg"},
    {"name": "Helldivers 2", "slug": "helldivers-2", "exe_names": ["helldivers2.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["27015-27050"], "protocol": "UDP", "category": "fps", "is_popular": True, "icon_url": f"{_S}/553850/header.jpg"},
    {"name": "Warframe", "slug": "warframe", "exe_names": ["Warframe.x64.exe", "Warframe.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["4950-4955", "6695-6699"], "protocol": "UDP", "category": "fps", "is_popular": False, "icon_url": f"{_S}/230410/header.jpg"},
    {"name": "Deep Rock Galactic", "slug": "deep-rock-galactic", "exe_names": ["FSD-Win64-Shipping.exe"], "server_ips": ["155.133.232.0/23", "162.254.192.0/21"], "ports": ["27015-27050"], "protocol": "UDP", "category": "fps", "is_popular": False, "icon_url": f"{_S}/548430/header.jpg"},
    {"name": "Delta Force", "slug": "delta-force", "exe_names": ["DeltaForce.exe", "deltaforce.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["27015-27050"], "protocol": "UDP", "category": "fps", "is_popular": True, "icon_url": f"{_S}/2507950/header.jpg"},
    {"name": "Dead by Daylight", "slug": "dead-by-daylight", "exe_names": ["DeadByDaylight-Win64-Shipping.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["8080", "8443", "27015-27050"], "protocol": "UDP", "category": "survival", "is_popular": True, "icon_url": f"{_S}/381210/header.jpg"},
    {"name": "Sea of Thieves", "slug": "sea-of-thieves", "exe_names": ["SoTGame.exe"], "server_ips": ["20.33.0.0/16", "20.40.0.0/13"], "ports": ["3074-3075", "27015-27050"], "protocol": "UDP", "category": "survival", "is_popular": False, "icon_url": f"{_S}/1172620/header.jpg"},
    {"name": "Lethal Company", "slug": "lethal-company", "exe_names": ["Lethal Company.exe"], "server_ips": ["155.133.232.0/23", "162.254.192.0/21"], "ports": ["27015-27050"], "protocol": "UDP", "category": "survival", "is_popular": False, "icon_url": f"{_S}/1966720/header.jpg"},
    {"name": "Elden Ring", "slug": "elden-ring", "exe_names": ["eldenring.exe"], "server_ips": ["155.133.232.0/23", "162.254.192.0/21"], "ports": ["27015-27050"], "protocol": "UDP", "category": "survival", "is_popular": False, "icon_url": f"{_S}/1245620/header.jpg"},
    {"name": "Monster Hunter Wilds", "slug": "monster-hunter-wilds", "exe_names": ["MonsterHunterWilds.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["27015-27050"], "protocol": "UDP", "category": "mmo", "is_popular": True, "icon_url": f"{_S}/2246340/header.jpg"},
    {"name": "Zenless Zone Zero", "slug": "zenless-zone-zero", "exe_names": ["ZenlessZoneZero.exe"], "server_ips": ["47.88.0.0/15"], "ports": ["22301-22302"], "protocol": "UDP", "category": "mmo", "is_popular": False, "icon_url": None},
]

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


def upgrade() -> None:
    # 1. Add icon_url column
    op.add_column("game_profiles", sa.Column("icon_url", sa.String(500), nullable=True))

    # 2. Update existing games with icon URLs
    for slug, icon_url in ICON_MAP.items():
        op.execute(
            game_profiles.update()
            .where(game_profiles.c.slug == slug)
            .values(icon_url=icon_url)
        )

    # 3. Insert new games
    now = datetime.now(timezone.utc)
    rows = []
    for g in NEW_GAMES:
        rows.append({
            "id": uuid.uuid4(),
            "name": g["name"],
            "slug": g["slug"],
            "exe_names": g["exe_names"],
            "server_ips": g["server_ips"],
            "ports": g["ports"],
            "protocol": g["protocol"],
            "category": g["category"],
            "is_popular": g["is_popular"],
            "icon_url": g["icon_url"],
            "created_at": now,
            "updated_at": now,
        })
    op.bulk_insert(game_profiles, rows)


def downgrade() -> None:
    # Remove new games
    for g in NEW_GAMES:
        op.execute(
            game_profiles.delete().where(game_profiles.c.slug == g["slug"])
        )
    # Drop icon_url column
    op.drop_column("game_profiles", "icon_url")
