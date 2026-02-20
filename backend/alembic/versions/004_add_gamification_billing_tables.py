"""Add gamification, billing, referrals, alerts, leaderboard, insights, and feature flags tables

Revision ID: 004_gamification_billing
Revises: 003_challenges_comps_clans
Create Date: 2026-02-18

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "004_gamification_billing"
down_revision: Union[str, None] = "003_challenges_comps_clans"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -- Add new columns to users table --
    op.add_column("users", sa.Column("referral_code", sa.String(6), unique=True, nullable=True))
    op.add_column("users", sa.Column("xp_total", sa.Integer(), server_default="0", nullable=False))
    op.add_column("users", sa.Column("trial_end_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("stripe_customer_id", sa.String(255), nullable=True))

    # -- Subscription Plans --
    op.create_table(
        "subscription_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("price_usd", sa.Numeric(10, 2), nullable=False),
        sa.Column("price_ngn", sa.Numeric(12, 2), nullable=False),
        sa.Column("features", postgresql.JSONB(), nullable=True),
        sa.Column("stripe_price_id", sa.String(255), nullable=True),
        sa.Column("stripe_annual_price_id", sa.String(255), nullable=True),
        sa.Column("paystack_plan_code", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # -- Customer Subscriptions --
    op.create_table(
        "customer_subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "plan_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("subscription_plans.id"),
            nullable=False,
        ),
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
        sa.Column("paystack_customer_id", sa.String(255), nullable=True),
        sa.Column("paystack_subscription_id", sa.String(255), nullable=True),
        sa.Column("status", sa.String(50), server_default="active", nullable=False),
        sa.Column("trial_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=True),
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

    # -- Streaks --
    op.create_table(
        "streaks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("current_streak", sa.Integer(), server_default="0", nullable=False),
        sa.Column("longest_streak", sa.Integer(), server_default="0", nullable=False),
        sa.Column("last_activity_date", sa.Date(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # -- Achievements --
    op.create_table(
        "achievements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column(
            "unlocked_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("xp_awarded", sa.Integer(), server_default="0", nullable=False),
    )

    # -- XP Ledger --
    op.create_table(
        "xp_ledger",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # -- Referrals --
    op.create_table(
        "referrals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "referrer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "referred_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("referral_code", sa.String(6), nullable=False),
        sa.Column("reward_granted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # -- Referral Credits --
    op.create_table(
        "referral_credits",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("days_credited", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # -- Price Alerts --
    op.create_table(
        "price_alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("asset", sa.String(20), nullable=False),
        sa.Column("threshold_price", sa.Numeric(18, 8), nullable=False),
        sa.Column("direction", sa.String(10), nullable=False),
        sa.Column("triggered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
    )

    # -- Leaderboard Snapshots --
    op.create_table(
        "leaderboard_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("period", sa.String(20), nullable=False),
        sa.Column("metric_type", sa.String(50), nullable=False),
        sa.Column("metric_value", sa.Numeric(18, 8), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column(
            "captured_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # -- Trade Insights --
    op.create_table(
        "trade_insights",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("trade_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("insight_text", sa.Text(), nullable=False),
        sa.Column("model", sa.String(100), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # -- Notification Preferences --
    op.create_table(
        "notification_preferences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("streak_reminders", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("price_alerts_enabled", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("challenge_updates", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("marketing_emails", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # -- Feature Flags --
    op.create_table(
        "feature_flags",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("feature_name", sa.String(100), unique=True, nullable=False),
        sa.Column("free_access", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("pro_access", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("elite_access", sa.Boolean(), server_default="true", nullable=False),
    )

    # -- Seed data: Feature Flags --
    op.execute("""
        INSERT INTO feature_flags (id, feature_name, free_access, pro_access, elite_access) VALUES
        (gen_random_uuid(), 'paper_trading', true, true, true),
        (gen_random_uuid(), 'basic_charts', true, true, true),
        (gen_random_uuid(), 'leaderboard_view', true, true, true),
        (gen_random_uuid(), 'advanced_charts', false, true, true),
        (gen_random_uuid(), 'ai_trade_insights', false, true, true),
        (gen_random_uuid(), 'price_alerts', false, true, true),
        (gen_random_uuid(), 'journal_export', false, true, true),
        (gen_random_uuid(), 'prop_challenges', false, false, true),
        (gen_random_uuid(), 'competitions', false, false, true),
        (gen_random_uuid(), 'clan_creation', false, false, true),
        (gen_random_uuid(), 'priority_support', false, false, true)
    """)

    # -- Seed data: Subscription Plans --
    op.execute("""
        INSERT INTO subscription_plans (id, name, price_usd, price_ngn, features) VALUES
        (gen_random_uuid(), 'Free', 0.00, 0.00, '{"paper_trading": true, "basic_charts": true, "leaderboard_view": true}'::jsonb),
        (gen_random_uuid(), 'Pro', 9.99, 5400.00, '{"paper_trading": true, "basic_charts": true, "advanced_charts": true, "ai_trade_insights": true, "price_alerts": true, "journal_export": true, "leaderboard_view": true}'::jsonb),
        (gen_random_uuid(), 'Elite', 24.99, 13500.00, '{"paper_trading": true, "basic_charts": true, "advanced_charts": true, "ai_trade_insights": true, "price_alerts": true, "journal_export": true, "leaderboard_view": true, "prop_challenges": true, "competitions": true, "clan_creation": true, "priority_support": true}'::jsonb)
    """)


def downgrade() -> None:
    op.drop_table("feature_flags")
    op.drop_table("notification_preferences")
    op.drop_table("trade_insights")
    op.drop_table("leaderboard_snapshots")
    op.drop_table("price_alerts")
    op.drop_table("referral_credits")
    op.drop_table("referrals")
    op.drop_table("xp_ledger")
    op.drop_table("achievements")
    op.drop_table("streaks")
    op.drop_table("customer_subscriptions")
    op.drop_table("subscription_plans")

    op.drop_column("users", "stripe_customer_id")
    op.drop_column("users", "trial_end_date")
    op.drop_column("users", "xp_total")
    op.drop_column("users", "referral_code")
