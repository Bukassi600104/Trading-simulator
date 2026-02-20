"""
Trading API Routes

REST endpoints for trading operations:
- Place orders
- Close positions
- Get portfolio state
- Update leverage

All endpoints require authentication via JWT bearer token.
Per-user rate limiting is applied to order placement.
"""

import asyncio
import uuid
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import (
    DEFAULT_LEVERAGE,
    DEFAULT_STARTING_BALANCE,
    SUPPORTED_LEVERAGE,
    SUPPORTED_SYMBOLS,
    OrderSide,
    OrderType,
)
from app.core.database import get_session
from app.core.security import TokenData, get_user_id_from_token, require_auth
from app.models.order import Order, OrderStatus
from app.models.portfolio import Portfolio
from jesse_custom.engine import get_portfolio_manager
from jesse_custom.exchange import OrderRequest, get_paper_exchange

router = APIRouter(prefix="/api/trading", tags=["trading"])


# Request/Response schemas
class PlaceOrderRequest(BaseModel):
    """Request to place a new order"""
    symbol: str = Field(..., description="Trading pair, e.g., 'BTC-USDT'")
    side: OrderSide = Field(..., description="BUY or SELL")
    qty: Decimal = Field(..., gt=0, description="Order quantity")
    order_type: OrderType = Field(default=OrderType.MARKET)
    price: Optional[Decimal] = Field(
        None, description="Limit price (for limit orders)"
    )
    stop_price: Optional[Decimal] = Field(
        None, description="Stop trigger price (for stop orders)"
    )
    reduce_only: bool = Field(default=False, description="Close position only")
    leverage: Optional[int] = Field(
        None, description="Override leverage for this trade"
    )
    stop_loss: Optional[Decimal] = Field(
        None, description="Stop-loss price (auto-closes position)"
    )
    take_profit: Optional[Decimal] = Field(
        None, description="Take-profit price (auto-closes position)"
    )


class ClosePositionRequest(BaseModel):
    """Request to close a position"""
    symbol: str
    qty: Optional[Decimal] = Field(
        None, description="Partial close quantity (None = full close)"
    )


class UpdateLeverageRequest(BaseModel):
    """Request to update leverage"""
    leverage: int = Field(..., ge=1, le=100)


class PortfolioResponse(BaseModel):
    """Portfolio state response"""
    class Config:
        extra = "allow"


def _resolve_user_id(
    token_data: TokenData,
    user_id_query: Optional[str] = None,
) -> uuid.UUID:
    """Resolve user ID from JWT token, falling back to query param for
    backward compatibility with demo users only."""
    jwt_uid = get_user_id_from_token(token_data)

    # If a query param is provided but differs from JWT, reject unless demo
    demo_uid = uuid.UUID("00000000-0000-0000-0000-000000000001")
    if user_id_query:
        try:
            query_uid = uuid.UUID(user_id_query)
        except ValueError:
            return jwt_uid
        # Only allow override to demo user for backward compat
        if query_uid == demo_uid and jwt_uid == demo_uid:
            return demo_uid
        # Otherwise always use the JWT user
        return jwt_uid
    return jwt_uid


@router.post("/orders")
async def place_order(
    request: PlaceOrderRequest,
    req: Request,
    token_data: TokenData = Depends(require_auth),
    user_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_session),
):
    """Place a new trading order.

    For market orders, executes immediately at current price.
    Rate limited to 30 requests per minute per user.
    """
    # Per-user rate limiting via Redis
    from app.core.security import get_redis

    uid = _resolve_user_id(token_data, user_id)

    r = await get_redis()
    rate_key = f"rate:orders:{uid}"
    current = await r.incr(rate_key)
    if current == 1:
        await r.expire(rate_key, 60)
    if current > 30:
        ttl = await r.ttl(rate_key)
        raise HTTPException(
            status_code=429,
            detail=f"Order rate limit exceeded. Try again in {ttl} seconds.",
            headers={"Retry-After": str(ttl)},
        )

    # Validate symbol
    if request.symbol not in SUPPORTED_SYMBOLS:
        raise HTTPException(
            status_code=400,
            detail=f"Symbol not supported. Supported: {SUPPORTED_SYMBOLS}",
        )

    # Validate leverage if provided
    if request.leverage and request.leverage not in SUPPORTED_LEVERAGE:
        raise HTTPException(
            status_code=400,
            detail=f"Leverage must be one of: {SUPPORTED_LEVERAGE}",
        )

    # Validate order-type-specific fields
    if request.order_type == OrderType.LIMIT and request.price is None:
        raise HTTPException(status_code=400, detail="Limit orders require price")

    if request.order_type == OrderType.STOP:
        if request.stop_price is None and request.price is not None:
            request.stop_price = request.price
            request.price = None
        if request.stop_price is None:
            raise HTTPException(status_code=400, detail="Stop orders require stop_price")

    exchange = get_paper_exchange()

    order = OrderRequest(
        symbol=request.symbol,
        side=request.side,
        order_type=request.order_type,
        qty=request.qty,
        price=request.price,
        stop_price=request.stop_price,
        reduce_only=request.reduce_only,
        leverage=request.leverage,
        stop_loss=request.stop_loss,
        take_profit=request.take_profit,
    )

    result = await exchange.submit_order(uid, order, db)

    if not result.success:
        raise HTTPException(status_code=400, detail=result.message)

    # Fire-and-forget gamification hooks
    try:
        from app.services.gamification import (
            award_trade_xp,
            check_and_award_achievements,
            process_referral_reward,
            update_streak,
        )

        uid_str = str(uid)
        asyncio.create_task(award_trade_xp(uid_str))
        asyncio.create_task(update_streak(uid_str))

        # Build achievement context from portfolio state
        manager = get_portfolio_manager()
        portfolio = manager.get_portfolio(uid)
        trade_value = float(request.qty * (result.fill_price or Decimal("0")))
        total_pnl = float(portfolio.total_realized_pnl + portfolio.total_unrealized_pnl) if portfolio else 0
        context = {
            "trade_count": 1,  # at least 1 since we just placed one
            "current_streak": 0,
            "total_pnl": total_pnl,
            "largest_trade_value": trade_value,
            "open_positions_count": portfolio.open_position_count if portfolio else 0,
        }
        asyncio.create_task(check_and_award_achievements(uid_str, context))
        asyncio.create_task(process_referral_reward(uid_str))
    except Exception:
        pass  # gamification must never block trading

    return {
        "success": True,
        "order_id": result.order_id,
        "filled_qty": str(result.filled_qty) if result.filled_qty is not None else None,
        "fill_price": str(result.fill_price) if result.fill_price is not None else None,
        "fee": str(result.fee) if result.fee is not None else None,
        "position": result.position,
        "message": result.message,
    }


@router.post("/close-position")
async def close_position(
    request: ClosePositionRequest,
    token_data: TokenData = Depends(require_auth),
    user_id: Optional[str] = Query(None),
):
    """Close an open position (fully or partially)"""
    uid = _resolve_user_id(token_data, user_id)

    exchange = get_paper_exchange()
    result = await exchange.close_position(uid, request.symbol, request.qty)

    if not result.success:
        raise HTTPException(status_code=400, detail=result.message)

    # Fire-and-forget AI coaching insight on position close
    try:
        from app.core.database import async_session_maker
        from sqlalchemy import text as sa_text

        async def _post_close_ai_coaching(user_id, symbol):
            """Generate AI coaching after a position is closed."""
            try:
                from app.services.ai_coaching import generate_trade_insight, store_trade_insight

                async with async_session_maker() as session:
                    # Get user tier
                    u = await session.execute(
                        sa_text("SELECT tier FROM users WHERE id = :uid"),
                        {"uid": str(user_id)},
                    )
                    user_row = u.mappings().first()
                    if not user_row or user_row["tier"] not in ("PRO", "ELITE", "PROP_CHALLENGE"):
                        return

                    # Get latest journal entry for this symbol
                    j = await session.execute(
                        sa_text(
                            "SELECT j.id, j.symbol, j.side, j.entry_price, j.exit_price, "
                            "j.pnl, j.pnl_percent, j.qty, j.entry_time, j.exit_time "
                            "FROM journal_entries j JOIN portfolios p ON j.portfolio_id = p.id "
                            "WHERE p.user_id = :uid AND j.symbol = :sym "
                            "ORDER BY j.exit_time DESC LIMIT 1"
                        ),
                        {"uid": str(user_id), "sym": symbol},
                    )
                    trade = j.mappings().first()
                    if not trade:
                        return

                    duration_hours = 0.0
                    if trade["entry_time"] and trade["exit_time"]:
                        delta = trade["exit_time"] - trade["entry_time"]
                        duration_hours = delta.total_seconds() / 3600

                    trade_data = {
                        "symbol": trade["symbol"],
                        "side": trade["side"],
                        "entry_price": float(trade["entry_price"]),
                        "exit_price": float(trade["exit_price"]),
                        "pnl": float(trade["pnl"]),
                        "pnl_percent": float(trade["pnl_percent"]),
                        "duration_hours": duration_hours,
                        "qty": float(trade["qty"]),
                    }

                    insight = await generate_trade_insight(trade_data, user_row["tier"])
                    if insight:
                        await store_trade_insight(str(trade["id"]), insight)
            except Exception as e:
                from loguru import logger
                logger.warning(f"AI coaching post-close failed: {e}")

        asyncio.create_task(_post_close_ai_coaching(uid, request.symbol))
    except Exception:
        pass  # AI coaching must never block trading

    return {
        "success": True,
        "message": result.message,
        "position": result.position,
    }


@router.get("/portfolio")
async def get_portfolio(
    token_data: TokenData = Depends(require_auth),
    user_id: Optional[str] = Query(None),
):
    """Get current portfolio state"""
    uid = _resolve_user_id(token_data, user_id)

    manager = get_portfolio_manager()
    portfolio = await manager.get_or_create_portfolio(uid)

    return portfolio.to_dict()


@router.get("/position/{symbol}")
async def get_position(
    symbol: str,
    token_data: TokenData = Depends(require_auth),
    user_id: Optional[str] = Query(None),
):
    """Get position for a specific symbol"""
    uid = _resolve_user_id(token_data, user_id)

    if symbol not in SUPPORTED_SYMBOLS:
        raise HTTPException(
            status_code=400,
            detail=f"Symbol not supported. Supported: {SUPPORTED_SYMBOLS}",
        )

    manager = get_portfolio_manager()
    portfolio = manager.get_portfolio(uid)

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    position = portfolio.get_position(symbol)
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")

    return position.to_dict()


@router.put("/leverage")
async def update_leverage(
    request: UpdateLeverageRequest,
    token_data: TokenData = Depends(require_auth),
    user_id: Optional[str] = Query(None),
):
    """Update leverage for future trades"""
    uid = _resolve_user_id(token_data, user_id)

    if request.leverage not in SUPPORTED_LEVERAGE:
        raise HTTPException(
            status_code=400,
            detail=f"Leverage must be one of: {SUPPORTED_LEVERAGE}",
        )

    manager = get_portfolio_manager()
    portfolio = await manager.get_or_create_portfolio(uid)
    portfolio.update_leverage(request.leverage)

    return {
        "success": True,
        "leverage": request.leverage,
        "message": f"Leverage updated to {request.leverage}x",
    }


@router.get("/symbols")
async def get_supported_symbols():
    """Get list of supported trading symbols"""
    return {
        "symbols": SUPPORTED_SYMBOLS,
        "leverage_options": SUPPORTED_LEVERAGE,
    }


@router.get("/stats")
async def get_trading_stats():
    """Get trading engine statistics"""
    manager = get_portfolio_manager()
    return manager.get_stats()


@router.post("/reset")
async def reset_portfolio(
    token_data: TokenData = Depends(require_auth),
    user_id: Optional[str] = Query(None),
):
    """Reset portfolio to initial state"""
    uid = _resolve_user_id(token_data, user_id)

    manager = get_portfolio_manager()

    # Remove old portfolio
    await manager.remove_portfolio(uid)

    # Create fresh portfolio
    portfolio = await manager.get_or_create_portfolio(
        uid,
        starting_balance=DEFAULT_STARTING_BALANCE,
        leverage=DEFAULT_LEVERAGE,
    )

    return {
        "success": True,
        "message": "Portfolio reset successfully",
        "portfolio": portfolio.to_dict(),
    }


@router.get("/orders/history")
async def get_order_history(
    token_data: TokenData = Depends(require_auth),
    user_id: Optional[str] = Query(None),
    limit: int = 50,
    db: AsyncSession = Depends(get_session),
):
    """Get order history"""
    uid = _resolve_user_id(token_data, user_id)

    result = await db.execute(select(Portfolio).where(Portfolio.user_id == uid))
    db_portfolio = result.scalars().first()

    if not db_portfolio:
        return []

    query = (
        select(Order)
        .where(Order.portfolio_id == db_portfolio.id)
        .order_by(desc(Order.created_at))
        .limit(limit)
    )

    result = await db.execute(query)
    orders = result.scalars().all()
    return orders


@router.get("/orders/open")
async def get_open_orders(
    token_data: TokenData = Depends(require_auth),
    user_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_session),
):
    """Get open orders"""
    uid = _resolve_user_id(token_data, user_id)

    result = await db.execute(select(Portfolio).where(Portfolio.user_id == uid))
    db_portfolio = result.scalars().first()

    if not db_portfolio:
        return []

    from app.core.config import OrderStatus

    query = (
        select(Order)
        .where(
            Order.portfolio_id == db_portfolio.id,
            Order.status == OrderStatus.OPEN,
        )
        .order_by(desc(Order.created_at))
    )

    result = await db.execute(query)
    orders = result.scalars().all()
    return orders


@router.delete("/orders/{order_id}")
async def cancel_order(
    order_id: str,
    token_data: TokenData = Depends(require_auth),
    user_id: Optional[str] = Query(None),
):
    """Cancel a pending (OPEN) order"""
    uid = _resolve_user_id(token_data, user_id)

    try:
        oid = uuid.UUID(order_id)
    except ValueError as err:
        raise HTTPException(
            status_code=400, detail="Invalid order_id format"
        ) from err

    exchange = get_paper_exchange()
    result = await exchange.cancel_order(uid, oid)

    if not result.success:
        raise HTTPException(status_code=400, detail=result.message)

    return {
        "success": True,
        "order_id": result.order_id,
        "message": result.message,
    }
