"""Add copy trading relationships and strategy builder tables

Revision ID: 005_copy_trading_strategies
Revises: 004_gamification_billing
Create Date: 2026-02-19

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "005_copy_trading_strategies"
down_revision: Union[str, None] = "004_gamification_billing"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -- Copy trading relationships --
    op.create_table(
        "copy_trading_relationships",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "follower_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "followed_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("copy_ratio", sa.Float(), default=1.0, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
        ),
        sa.UniqueConstraint("follower_id", "followed_id", name="uq_copy_pair"),
    )
    op.create_index(
        "ix_copy_trading_follower",
        "copy_trading_relationships",
        ["follower_id"],
    )
    op.create_index(
        "ix_copy_trading_followed",
        "copy_trading_relationships",
        ["followed_id"],
    )

    # -- Strategy builder --
    op.create_table(
        "strategies",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("rules", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("is_active", sa.Boolean(), default=False, nullable=False),
        sa.Column("is_public", sa.Boolean(), default=False, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            onupdate=sa.text("NOW()"),
        ),
    )
    op.create_index("ix_strategies_user", "strategies", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_strategies_user", table_name="strategies")
    op.drop_table("strategies")
    op.drop_index("ix_copy_trading_followed", table_name="copy_trading_relationships")
    op.drop_index("ix_copy_trading_follower", table_name="copy_trading_relationships")
    op.drop_table("copy_trading_relationships")
