"""
Database configuration for Terminal Zero Trading Simulator
Uses SQLAlchemy async with PostgreSQL
"""

import os
import ssl
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/terminal_zero"
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models"""
    pass


# Use SSL only for external cloud DB connections (e.g. Supabase hosted)
# Skip SSL for localhost and Railway internal network (.railway.internal)
_connect_args: dict = {}
_needs_ssl = (
    "localhost" not in DATABASE_URL
    and "127.0.0.1" not in DATABASE_URL
    and ".railway.internal" not in DATABASE_URL
)
if _needs_ssl:
    _ssl_ctx = ssl.create_default_context()
    _ssl_ctx.check_hostname = False
    _ssl_ctx.verify_mode = ssl.CERT_NONE
    _connect_args["ssl"] = _ssl_ctx

engine = create_async_engine(DATABASE_URL, echo=False, connect_args=_connect_args)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for FastAPI routes to get database session"""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


# Alias for get_db - used in auth routes
get_session = get_db


# ---------------------------------------------------------------------------
# Lightweight, idempotent additive migrations.
#
# Production (Railway) starts the API with plain `uvicorn` and no
# `alembic upgrade` step, so the live schema is managed by `create_all`, which
# creates *new tables* but never adds *new columns* to existing ones. These
# `ADD COLUMN IF NOT EXISTS` statements close that gap safely on startup so a
# deploy that introduces new columns does not break the running app. They are
# purely additive and non-destructive; the canonical schema lives in Alembic.
# ---------------------------------------------------------------------------
_ADDITIVE_DDL: list[str] = [
    # School-domain identity on users
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(128)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(120)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) "
    "NOT NULL DEFAULT 'solo_learner'",
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_firebase_uid "
    "ON users (firebase_uid)",
    # Student scoping on trading tables
    "ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS student_id UUID",
    "CREATE INDEX IF NOT EXISTS ix_portfolios_student_id "
    "ON portfolios (student_id)",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS student_id UUID",
    "CREATE INDEX IF NOT EXISTS ix_orders_student_id ON orders (student_id)",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS fee NUMERIC(18, 8) DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS slippage NUMERIC(18, 8) DEFAULT 0",
    "ALTER TABLE positions ADD COLUMN IF NOT EXISTS student_id UUID",
    "CREATE INDEX IF NOT EXISTS ix_positions_student_id "
    "ON positions (student_id)",
    # Journal forecast + coach fields
    "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS student_id UUID",
    "CREATE INDEX IF NOT EXISTS ix_journal_entries_student_id "
    "ON journal_entries (student_id)",
    "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS forecast_snapshot JSONB",
    "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS coach_feedback TEXT",
    "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS coach_status "
    "VARCHAR(20) NOT NULL DEFAULT 'pending'",
]


async def _run_additive_migrations(conn) -> None:
    """Apply idempotent ADD COLUMN/INDEX statements one at a time."""
    from sqlalchemy import text

    for stmt in _ADDITIVE_DDL:
        try:
            await conn.execute(text(stmt))
        except Exception:
            # Non-fatal: a single failed additive statement must not block
            # startup or the remaining statements.
            pass


async def init_db():
    """Initialize database tables and apply additive schema fixes.

    Importing ``app.models`` ensures every table (including the new
    school/cohort/student domain) is registered on ``Base.metadata`` before
    ``create_all`` runs.
    """
    import app.models  # noqa: F401  (register all mappers/tables)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _run_additive_migrations(conn)
