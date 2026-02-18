"""Add challenges, competitions, clans, and activity feed tables

Revision ID: 003_challenges_comps_clans
Revises: 002_add_is_superuser
Create Date: 2026-02-12

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "003_challenges_comps_clans"
down_revision: Union[str, None] = "002_add_is_superuser"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -- Challenges --
    op.create_table(
        "challenges",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "portfolio_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("portfolios.id"),
            nullable=False,
        ),
        sa.Column(
            "phase",
            sa.Enum("PHASE_1", "PHASE_2", "FUNDED", name="challengephase"),
            default="PHASE_1",
        ),
        sa.Column(
            "status",
            sa.Enum("ACTIVE", "PASSED", "FAILED", "CANCELLED", name="challengestatus"),
            default="ACTIVE",
        ),
        sa.Column("starting_balance", sa.Numeric(18, 8), nullable=False),
        sa.Column("profit_target", sa.Numeric(18, 8), nullable=False),
        sa.Column("daily_drawdown_limit", sa.Numeric(18, 8), nullable=False),
        sa.Column("total_drawdown_limit", sa.Numeric(18, 8), nullable=False),
        sa.Column("current_balance", sa.Numeric(18, 8), nullable=False),
        sa.Column("highest_balance", sa.Numeric(18, 8), nullable=False),
        sa.Column("daily_start_balance", sa.Numeric(18, 8), nullable=False),
        sa.Column("total_trades", sa.Integer(), default=0),
        sa.Column("winning_trades", sa.Integer(), default=0),
        sa.Column("losing_trades", sa.Integer(), default=0),
        sa.Column("total_pnl", sa.Numeric(18, 8), default=0),
        sa.Column("fail_reason", sa.Text(), nullable=True),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "daily_reset_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # -- Competitions --
    op.create_table(
        "competitions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "UPCOMING", "ACTIVE", "ENDED", "CANCELLED",
                name="competitionstatus",
            ),
            default="UPCOMING",
        ),
        sa.Column("starting_balance", sa.Numeric(18, 8), nullable=False),
        sa.Column("max_participants", sa.Integer(), nullable=True),
        sa.Column("entry_fee", sa.Numeric(18, 2), default=0),
        sa.Column("prize_pool", sa.String(255), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # -- Competition Entries --
    op.create_table(
        "competition_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "competition_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("competitions.id"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "portfolio_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("portfolios.id"),
            nullable=False,
        ),
        sa.Column("starting_balance", sa.Numeric(18, 8), nullable=False),
        sa.Column("current_balance", sa.Numeric(18, 8), nullable=False),
        sa.Column("pnl", sa.Numeric(18, 8), default=0),
        sa.Column("pnl_percent", sa.Numeric(10, 4), default=0),
        sa.Column("rank", sa.Integer(), nullable=True),
        sa.Column("total_trades", sa.Integer(), default=0),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    op.create_unique_constraint(
        "uq_competition_user",
        "competition_entries",
        ["competition_id", "user_id"],
    )

    # -- Clans --
    op.create_table(
        "clans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(50), unique=True, nullable=False),
        sa.Column("tag", sa.String(6), unique=True, nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("avatar_url", sa.String(512), nullable=True),
        sa.Column(
            "leader_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("max_members", sa.Integer(), default=20),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # -- Clan Members --
    op.create_table(
        "clan_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "clan_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clans.id"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "role",
            sa.Enum("LEADER", "OFFICER", "MEMBER", name="clanrole"),
            default="MEMBER",
        ),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    op.create_unique_constraint(
        "uq_clan_user", "clan_members", ["clan_id", "user_id"]
    )

    # -- Activity Feed --
    op.create_table(
        "activity_feed",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "activity_type",
            sa.Enum(
                "TRADE_WIN",
                "TRADE_LOSS",
                "CHALLENGE_STARTED",
                "CHALLENGE_PASSED",
                "CHALLENGE_FAILED",
                "COMPETITION_JOINED",
                "COMPETITION_WON",
                "CLAN_CREATED",
                "CLAN_JOINED",
                "MILESTONE",
                name="activitytype",
            ),
            nullable=False,
        ),
        sa.Column("symbol", sa.String(20), nullable=True),
        sa.Column("pnl", sa.Numeric(18, 8), nullable=True),
        sa.Column("pnl_percent", sa.Numeric(10, 4), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("challenge_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("competition_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            index=True,
        ),
    )


def downgrade() -> None:
    op.drop_table("activity_feed")
    op.drop_constraint("uq_clan_user", "clan_members", type_="unique")
    op.drop_table("clan_members")
    op.drop_table("clans")
    op.drop_constraint("uq_competition_user", "competition_entries", type_="unique")
    op.drop_table("competition_entries")
    op.drop_table("competitions")
    op.drop_table("challenges")

    op.execute("DROP TYPE IF EXISTS activitytype")
    op.execute("DROP TYPE IF EXISTS clanrole")
    op.execute("DROP TYPE IF EXISTS competitionstatus")
    op.execute("DROP TYPE IF EXISTS challengestatus")
    op.execute("DROP TYPE IF EXISTS challengephase")
