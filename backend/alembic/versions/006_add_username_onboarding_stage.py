"""Add username and onboarding_stage to users table

Revision ID: 006
Revises: 005
Create Date: 2026-02-20
"""

from alembic import op
import sqlalchemy as sa

revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('username', sa.String(50), nullable=True))
    op.add_column(
        'users',
        sa.Column('onboarding_stage', sa.Integer(), nullable=False, server_default='0')
    )
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_column('users', 'onboarding_stage')
    op.drop_column('users', 'username')
