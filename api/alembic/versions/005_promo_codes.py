"""005_promo_codes

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-27 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create promo_codes table
    op.create_table(
        'promo_codes',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('code', sa.String(50), unique=True, index=True, nullable=False),
        sa.Column('discount_percent', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('discount_amount', sa.Numeric(10, 2), nullable=True),
        sa.Column('max_uses', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('current_uses', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('valid_from', sa.DateTime(timezone=True), nullable=True),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('applicable_plans', sa.String(100), nullable=False, server_default='all'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Add promo fields to payments
    op.add_column('payments', sa.Column('promo_code', sa.String(50), nullable=True))
    op.add_column('payments', sa.Column('original_amount', sa.Numeric(10, 2), nullable=True))


def downgrade() -> None:
    op.drop_column('payments', 'original_amount')
    op.drop_column('payments', 'promo_code')
    op.drop_table('promo_codes')
