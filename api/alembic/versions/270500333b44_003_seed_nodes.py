"""003_seed_nodes

Revision ID: 270500333b44
Revises: 721064990f0f
Create Date: 2026-02-27 15:22:50.757850

"""
import uuid
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '270500333b44'
down_revision: Union[str, None] = '721064990f0f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

nodes = sa.table(
    'nodes',
    sa.column('id', sa.Uuid),
    sa.column('name', sa.String),
    sa.column('location', sa.String),
    sa.column('city', sa.String),
    sa.column('ip_address', sa.String),
    sa.column('status', sa.String),
    sa.column('current_load', sa.Integer),
    sa.column('max_sessions', sa.Integer),
    sa.column('relay_port', sa.Integer),
    sa.column('relay_api_port', sa.Integer),
    sa.column('created_at', sa.DateTime),
    sa.column('updated_at', sa.DateTime),
)

NODES = [
    {
        'name': 'Frankfurt DE',
        'location': 'DE',
        'city': 'Frankfurt',
        'ip_address': '93.183.70.55',
        'relay_port': 443,
        'relay_api_port': 8443,
    },
    {
        'name': 'Stockholm SE',
        'location': 'SE',
        'city': 'Stockholm',
        'ip_address': '0.0.0.0',
        'relay_port': 443,
        'relay_api_port': 8443,
    },
    {
        'name': 'New York US',
        'location': 'US',
        'city': 'New York',
        'ip_address': '0.0.0.0',
        'relay_port': 443,
        'relay_api_port': 8443,
    },
    {
        'name': 'Riga LV',
        'location': 'LV',
        'city': 'Riga',
        'ip_address': '0.0.0.0',
        'relay_port': 443,
        'relay_api_port': 8443,
    },
]


def upgrade() -> None:
    now = datetime.now(timezone.utc)
    rows = []
    for n in NODES:
        rows.append({
            'id': uuid.uuid4(),
            'name': n['name'],
            'location': n['location'],
            'city': n['city'],
            'ip_address': n['ip_address'],
            'status': 'active',
            'current_load': 0,
            'max_sessions': 1000,
            'relay_port': n['relay_port'],
            'relay_api_port': n['relay_api_port'],
            'created_at': now,
            'updated_at': now,
        })
    op.bulk_insert(nodes, rows)


def downgrade() -> None:
    op.execute("DELETE FROM nodes")
