"""004_billing_payments

Revision ID: a1b2c3d4e5f6
Revises: 270500333b44
Create Date: 2026-02-27 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '270500333b44'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create payments table
    op.create_table(
        'payments',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('user_id', sa.Uuid(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(10), nullable=False, server_default='RUB'),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('plan', sa.String(20), nullable=False),
        sa.Column('donatepay_id', sa.String(255), nullable=True),
        sa.Column('donatepay_comment', sa.String(500), nullable=True),
        sa.Column('subscription_id', sa.Uuid(), sa.ForeignKey('subscriptions.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Add columns to subscriptions
    op.add_column('subscriptions', sa.Column('plan', sa.String(20), server_default='', nullable=False))
    op.add_column('subscriptions', sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True))

    # Add trial_used to users
    op.add_column('users', sa.Column('trial_used', sa.Boolean(), server_default=sa.text('false'), nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'trial_used')
    op.drop_column('subscriptions', 'cancelled_at')
    op.drop_column('subscriptions', 'plan')
    op.drop_table('payments')
