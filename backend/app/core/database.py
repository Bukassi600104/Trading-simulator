"""
Database configuration for Terminal Zero Trading Simulator
Uses SQLAlchemy async with PostgreSQL
"""

import os
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


engine = create_async_engine(DATABASE_URL, echo=False)

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
