"""
Strategy Builder API.

Allows users to create, store, and manage automated trading strategies
using a rule-based system. Rules are stored as JSONB for flexibility.
"""
import uuid
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.core.database import async_session_maker
from app.core.security import TokenData, get_current_user, get_user_id_from_token

router = APIRouter(prefix="/api/strategies", tags=["strategy-builder"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class StrategyRule(BaseModel):
    """A single rule in a strategy."""
    type: str          # "indicator_cross", "price_level", "time_window", etc.
    indicator: Optional[str] = None  # "RSI", "SMA", "EMA", "MACD"
    period: Optional[int] = None
    threshold: Optional[float] = None
    direction: Optional[str] = None  # "above", "below", "cross_up", "cross_down"
    action: str        # "buy", "sell", "close"
    symbol: Optional[str] = None
    size_pct: float = 10.0    # % of portfolio to use


class CreateStrategyRequest(BaseModel):
    name: str
    description: Optional[str] = None
    rules: List[StrategyRule] = []
    is_public: bool = False


class UpdateStrategyRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rules: Optional[List[StrategyRule]] = None
    is_active: Optional[bool] = None
    is_public: Optional[bool] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("")
async def list_strategies(token_data: TokenData = Depends(get_current_user)):
    """List all strategies for the authenticated user."""
    from app.models.strategy import Strategy

    user_id = get_user_id_from_token(token_data)
    async with async_session_maker() as session:
        result = await session.execute(
            select(Strategy).where(Strategy.user_id == user_id)
        )
        strategies = result.scalars().all()

    return {
        "strategies": [
            {
                "id": str(s.id),
                "name": s.name,
                "description": s.description,
                "rules": s.rules,
                "is_active": s.is_active,
                "is_public": s.is_public,
                "created_at": s.created_at.isoformat(),
                "updated_at": s.updated_at.isoformat(),
            }
            for s in strategies
        ]
    }


@router.post("")
async def create_strategy(
    body: CreateStrategyRequest,
    token_data: TokenData = Depends(get_current_user),
):
    """Create a new trading strategy."""
    from app.models.strategy import Strategy

    user_id = get_user_id_from_token(token_data)

    async with async_session_maker() as session:
        strategy = Strategy(
            user_id=user_id,
            name=body.name,
            description=body.description,
            rules=[r.model_dump() for r in body.rules],
            is_active=False,
            is_public=body.is_public,
        )
        session.add(strategy)
        await session.commit()
        await session.refresh(strategy)

    logger.info(f"User {user_id} created strategy: {body.name}")
    return {
        "id": str(strategy.id),
        "name": strategy.name,
        "rules": strategy.rules,
        "is_active": strategy.is_active,
    }


@router.get("/public")
async def list_public_strategies(limit: int = 20):
    """Browse community-shared strategies (no auth required)."""
    from app.models.strategy import Strategy
    from app.models.user import User

    async with async_session_maker() as session:
        result = await session.execute(
            select(Strategy, User)
            .join(User, User.id == Strategy.user_id)
            .where(Strategy.is_public == True)
            .limit(limit)
        )
        rows = result.all()

    return {
        "strategies": [
            {
                "id": str(s.id),
                "name": s.name,
                "description": s.description,
                "rules": s.rules,
                "author": u.email.split("@")[0],
                "created_at": s.created_at.isoformat(),
            }
            for s, u in rows
        ]
    }


@router.get("/{strategy_id}")
async def get_strategy(
    strategy_id: str,
    token_data: TokenData = Depends(get_current_user),
):
    """Get a specific strategy by ID."""
    from app.models.strategy import Strategy

    user_id = get_user_id_from_token(token_data)
    try:
        sid = uuid.UUID(strategy_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid strategy ID")

    async with async_session_maker() as session:
        result = await session.execute(
            select(Strategy).where(Strategy.id == sid)
        )
        strategy = result.scalar_one_or_none()

    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    if strategy.user_id != user_id and not strategy.is_public:
        raise HTTPException(status_code=403, detail="Access denied")

    return {
        "id": str(strategy.id),
        "name": strategy.name,
        "description": strategy.description,
        "rules": strategy.rules,
        "is_active": strategy.is_active,
        "is_public": strategy.is_public,
        "created_at": strategy.created_at.isoformat(),
        "updated_at": strategy.updated_at.isoformat(),
    }


@router.patch("/{strategy_id}")
async def update_strategy(
    strategy_id: str,
    body: UpdateStrategyRequest,
    token_data: TokenData = Depends(get_current_user),
):
    """Update a strategy's rules, name, or status."""
    from app.models.strategy import Strategy

    user_id = get_user_id_from_token(token_data)
    try:
        sid = uuid.UUID(strategy_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid strategy ID")

    async with async_session_maker() as session:
        result = await session.execute(
            select(Strategy).where(Strategy.id == sid)
        )
        strategy = result.scalar_one_or_none()
        if not strategy:
            raise HTTPException(status_code=404, detail="Strategy not found")
        if strategy.user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        if body.name is not None:
            strategy.name = body.name
        if body.description is not None:
            strategy.description = body.description
        if body.rules is not None:
            strategy.rules = [r.model_dump() for r in body.rules]
        if body.is_active is not None:
            strategy.is_active = body.is_active
        if body.is_public is not None:
            strategy.is_public = body.is_public

        await session.commit()

    return {"success": True, "strategy_id": strategy_id}


@router.delete("/{strategy_id}")
async def delete_strategy(
    strategy_id: str,
    token_data: TokenData = Depends(get_current_user),
):
    """Delete a strategy."""
    from app.models.strategy import Strategy

    user_id = get_user_id_from_token(token_data)
    try:
        sid = uuid.UUID(strategy_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid strategy ID")

    async with async_session_maker() as session:
        result = await session.execute(
            select(Strategy).where(Strategy.id == sid)
        )
        strategy = result.scalar_one_or_none()
        if not strategy:
            raise HTTPException(status_code=404, detail="Strategy not found")
        if strategy.user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        await session.delete(strategy)
        await session.commit()

    return {"success": True}
