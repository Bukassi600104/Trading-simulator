"""Initial migration - Create all tables

Revision ID: 001_initial
Revises: 
Create Date: 2024-12-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'email', sa.String(255), unique=True, nullable=False, index=True
        ),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column(
            'tier',
            sa.Enum('FREE', 'PRO', 'PROP_CHALLENGE', name='usertier'),
            default='FREE'
        ),
        sa.Column('clan_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now()
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now()
        ),
    )

    # Create portfolios table
    op.create_table(
        'portfolios',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'user_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('users.id'),
            nullable=False,
            index=True
        ),
        sa.Column(
            'balance', sa.Numeric(precision=18, scale=8), default=10000.0
        ),
        sa.Column(
            'starting_balance',
            sa.Numeric(precision=18, scale=8),
            default=10000.0
        ),
        sa.Column('leverage', sa.Integer(), default=10),
        sa.Column(
            'max_drawdown_watermark',
            sa.Numeric(precision=18, scale=8),
            default=10000.0
        ),
        sa.Column('is_liquidated', sa.Boolean(), default=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now()
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now()
        ),
    )

    # Create orders table
    op.create_table(
        'orders',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'portfolio_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('portfolios.id'),
            nullable=False,
            index=True
        ),
        sa.Column('symbol', sa.String(20), nullable=False, index=True),
        sa.Column(
            'side', sa.Enum('BUY', 'SELL', name='orderside'), nullable=False
        ),
        sa.Column(
            'order_type',
            sa.Enum('MARKET', 'LIMIT', 'STOP', name='ordertype'),
            nullable=False
        ),
        sa.Column('qty', sa.Numeric(precision=18, scale=8), nullable=False),
        sa.Column('price', sa.Numeric(precision=18, scale=8), nullable=True),
        sa.Column('filled_qty', sa.Numeric(precision=18, scale=8), default=0),
        sa.Column(
            'avg_fill_price', sa.Numeric(precision=18, scale=8), nullable=True
        ),
        sa.Column(
            'status',
            sa.Enum(
                'OPEN', 'FILLED', 'CANCELED', 'PARTIALLY_FILLED',
                name='orderstatus'
            ),
            default='OPEN'
        ),
        sa.Column('reduce_only', sa.Boolean(), default=False),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now()
        ),
        sa.Column('filled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('canceled_at', sa.DateTime(timezone=True), nullable=True),
    )

    # Create positions table
    op.create_table(
        'positions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'portfolio_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('portfolios.id'),
            nullable=False,
            index=True
        ),
        sa.Column('symbol', sa.String(20), nullable=False, index=True),
        sa.Column(
            'side',
            sa.Enum('LONG', 'SHORT', 'FLAT', name='positionside'),
            default='FLAT'
        ),
        sa.Column('qty', sa.Numeric(precision=18, scale=8), default=0),
        sa.Column('entry_price', sa.Numeric(precision=18, scale=8), default=0),
        sa.Column(
            'current_price', sa.Numeric(precision=18, scale=8), default=0
        ),
        sa.Column(
            'unrealized_pnl', sa.Numeric(precision=18, scale=8), default=0
        ),
        sa.Column('realized_pnl', sa.Numeric(precision=18, scale=8), default=0),
        sa.Column('leverage', sa.Integer(), default=10),
        sa.Column(
            'liquidation_price',
            sa.Numeric(precision=18, scale=8),
            nullable=True
        ),
        sa.Column('opened_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now()
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now()
        ),
    )

    # Create unique constraint for one position per symbol per portfolio
    op.create_unique_constraint(
        'uq_portfolio_symbol',
        'positions',
        ['portfolio_id', 'symbol']
    )


def downgrade() -> None:
    op.drop_constraint('uq_portfolio_symbol', 'positions', type_='unique')
    op.drop_table('positions')
    op.drop_table('orders')
    op.drop_table('portfolios')
    op.drop_table('users')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS positionside')
    op.execute('DROP TYPE IF EXISTS orderstatus')
    op.execute('DROP TYPE IF EXISTS ordertype')
    op.execute('DROP TYPE IF EXISTS orderside')
    op.execute('DROP TYPE IF EXISTS usertier')
