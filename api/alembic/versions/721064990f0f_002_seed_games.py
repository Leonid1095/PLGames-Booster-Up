"""002_seed_games

Revision ID: 721064990f0f
Revises: 33c7d2d0bfce
Create Date: 2026-02-27 15:18:36.814093

"""
import uuid
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.seed_games import GAMES

# revision identifiers, used by Alembic.
revision: str = '721064990f0f'
down_revision: Union[str, None] = '33c7d2d0bfce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

game_profiles = sa.table(
    'game_profiles',
    sa.column('id', sa.Uuid),
    sa.column('name', sa.String),
    sa.column('slug', sa.String),
    sa.column('exe_names', sa.ARRAY(sa.String)),
    sa.column('server_ips', sa.ARRAY(sa.String)),
    sa.column('ports', sa.ARRAY(sa.String)),
    sa.column('protocol', sa.String),
    sa.column('category', sa.String),
    sa.column('is_popular', sa.Boolean),
    sa.column('created_at', sa.DateTime),
    sa.column('updated_at', sa.DateTime),
)


def upgrade() -> None:
    now = datetime.now(timezone.utc)
    rows = []
    for g in GAMES:
        rows.append({
            'id': uuid.uuid4(),
            'name': g['name'],
            'slug': g['slug'],
            'exe_names': g['exe_names'],
            'server_ips': g['server_ips'],
            'ports': g['ports'],
            'protocol': g['protocol'],
            'category': g['category'],
            'is_popular': g['is_popular'],
            'created_at': now,
            'updated_at': now,
        })
    op.bulk_insert(game_profiles, rows)


def downgrade() -> None:
    op.execute("DELETE FROM game_profiles")
