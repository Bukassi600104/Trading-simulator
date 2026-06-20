"""School/academy data model (teacher-led training revamp)

Adds the School, SchoolSubscription, Cohort, Student, Scenario and
ReplaySession tables, the Firebase identity + role columns on users, student
scoping on the trading tables, and the forecast/coach fields on journal
entries.

Revision ID: 007
Revises: 006
Create Date: 2026-06-20
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # users: Firebase identity + role
    # ------------------------------------------------------------------
    op.add_column("users", sa.Column("firebase_uid", sa.String(128), nullable=True))
    op.add_column("users", sa.Column("display_name", sa.String(120), nullable=True))
    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.String(20),
            nullable=False,
            server_default="solo_learner",
        ),
    )
    op.create_index(
        op.f("ix_users_firebase_uid"), "users", ["firebase_uid"], unique=True
    )

    # ------------------------------------------------------------------
    # schools
    # ------------------------------------------------------------------
    op.create_table(
        "schools",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("slug", sa.String(80), nullable=False, unique=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("branding", postgresql.JSONB(), nullable=True),
        sa.Column("paystack_ref", sa.String(255), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
    )
    op.create_index(op.f("ix_schools_owner_user_id"), "schools", ["owner_user_id"])
    op.create_index(op.f("ix_schools_slug"), "schools", ["slug"], unique=True)

    # ------------------------------------------------------------------
    # school_subscriptions
    # ------------------------------------------------------------------
    op.create_table(
        "school_subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "school_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("schools.id"),
            nullable=False,
            unique=True,
        ),
        sa.Column("tier", sa.String(20), nullable=False, server_default="starter"),
        sa.Column("status", sa.String(20), nullable=False, server_default="trialing"),
        sa.Column("seats_total", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("seats_used", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "paper_pool_total",
            sa.Numeric(18, 2),
            nullable=False,
            server_default="10000.00",
        ),
        sa.Column(
            "paper_pool_allocated",
            sa.Numeric(18, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("paystack_ref", sa.String(255), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
    )

    # ------------------------------------------------------------------
    # cohorts
    # ------------------------------------------------------------------
    op.create_table(
        "cohorts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "school_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("schools.id"),
            nullable=False,
        ),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column(
            "instructor_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("leverage_cap", sa.Integer(), nullable=False, server_default="20"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
    )
    op.create_index(op.f("ix_cohorts_school_id"), "cohorts", ["school_id"])
    op.create_index(
        op.f("ix_cohorts_instructor_user_id"), "cohorts", ["instructor_user_id"]
    )

    # ------------------------------------------------------------------
    # students
    # ------------------------------------------------------------------
    op.create_table(
        "students",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "cohort_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("cohorts.id"),
            nullable=True,
        ),
        sa.Column(
            "school_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("schools.id"),
            nullable=False,
        ),
        sa.Column(
            "paper_account_balance",
            sa.Numeric(18, 2),
            nullable=False,
            server_default="10000.00",
        ),
        sa.Column("status", sa.String(20), nullable=False, server_default="invited"),
        sa.Column(
            "joined_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
    )
    op.create_index(op.f("ix_students_user_id"), "students", ["user_id"])
    op.create_index(op.f("ix_students_cohort_id"), "students", ["cohort_id"])
    op.create_index(op.f("ix_students_school_id"), "students", ["school_id"])

    # ------------------------------------------------------------------
    # scenarios
    # ------------------------------------------------------------------
    op.create_table(
        "scenarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "school_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("schools.id"),
            nullable=True,
        ),
        sa.Column("type", sa.String(20), nullable=False, server_default="replay"),
        sa.Column("symbol", sa.String(20), nullable=False),
        sa.Column("timeframe", sa.String(10), nullable=False),
        sa.Column("name", sa.String(160), nullable=True),
        sa.Column("source_range", postgresql.JSONB(), nullable=True),
        sa.Column("seed_context", postgresql.JSONB(), nullable=True),
        sa.Column("objective", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
    )
    op.create_index(op.f("ix_scenarios_school_id"), "scenarios", ["school_id"])
    op.create_index(op.f("ix_scenarios_symbol"), "scenarios", ["symbol"])

    # ------------------------------------------------------------------
    # replay_sessions
    # ------------------------------------------------------------------
    op.create_table(
        "replay_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "cohort_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("cohorts.id"),
            nullable=False,
        ),
        sa.Column(
            "scenario_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("scenarios.id"),
            nullable=False,
        ),
        sa.Column("state", sa.String(20), nullable=False, server_default="scheduled"),
        sa.Column("speed", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
    )
    op.create_index(
        op.f("ix_replay_sessions_cohort_id"), "replay_sessions", ["cohort_id"]
    )
    op.create_index(
        op.f("ix_replay_sessions_scenario_id"), "replay_sessions", ["scenario_id"]
    )

    # ------------------------------------------------------------------
    # student scoping + execution detail on trading tables
    # ------------------------------------------------------------------
    op.add_column(
        "portfolios",
        sa.Column(
            "student_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("students.id"),
            nullable=True,
        ),
    )
    op.create_index(
        op.f("ix_portfolios_student_id"), "portfolios", ["student_id"]
    )

    op.add_column(
        "orders",
        sa.Column(
            "student_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("students.id"),
            nullable=True,
        ),
    )
    op.create_index(op.f("ix_orders_student_id"), "orders", ["student_id"])
    op.add_column(
        "orders",
        sa.Column("fee", sa.Numeric(18, 8), nullable=True, server_default="0"),
    )
    op.add_column(
        "orders",
        sa.Column("slippage", sa.Numeric(18, 8), nullable=True, server_default="0"),
    )

    op.add_column(
        "positions",
        sa.Column(
            "student_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("students.id"),
            nullable=True,
        ),
    )
    op.create_index(op.f("ix_positions_student_id"), "positions", ["student_id"])

    # ------------------------------------------------------------------
    # journal entries: forecast snapshot + AI coach fields
    # ------------------------------------------------------------------
    op.add_column(
        "journal_entries",
        sa.Column(
            "student_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("students.id"),
            nullable=True,
        ),
    )
    op.create_index(
        op.f("ix_journal_entries_student_id"), "journal_entries", ["student_id"]
    )
    op.add_column(
        "journal_entries",
        sa.Column("forecast_snapshot", postgresql.JSONB(), nullable=True),
    )
    op.add_column(
        "journal_entries", sa.Column("coach_feedback", sa.Text(), nullable=True)
    )
    op.add_column(
        "journal_entries",
        sa.Column(
            "coach_status",
            sa.String(20),
            nullable=False,
            server_default="pending",
        ),
    )


def downgrade() -> None:
    # journal entries
    op.drop_column("journal_entries", "coach_status")
    op.drop_column("journal_entries", "coach_feedback")
    op.drop_column("journal_entries", "forecast_snapshot")
    op.drop_index(op.f("ix_journal_entries_student_id"), table_name="journal_entries")
    op.drop_column("journal_entries", "student_id")

    # positions
    op.drop_index(op.f("ix_positions_student_id"), table_name="positions")
    op.drop_column("positions", "student_id")

    # orders
    op.drop_column("orders", "slippage")
    op.drop_column("orders", "fee")
    op.drop_index(op.f("ix_orders_student_id"), table_name="orders")
    op.drop_column("orders", "student_id")

    # portfolios
    op.drop_index(op.f("ix_portfolios_student_id"), table_name="portfolios")
    op.drop_column("portfolios", "student_id")

    op.drop_table("replay_sessions")
    op.drop_table("scenarios")
    op.drop_table("students")
    op.drop_table("cohorts")
    op.drop_table("school_subscriptions")
    op.drop_table("schools")

    op.drop_index(op.f("ix_users_firebase_uid"), table_name="users")
    op.drop_column("users", "role")
    op.drop_column("users", "display_name")
    op.drop_column("users", "firebase_uid")
