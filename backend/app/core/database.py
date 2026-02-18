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


async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
