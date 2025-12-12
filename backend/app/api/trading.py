"""
Trading API Routes

REST endpoints for trading operations:
- Place orders
- Close positions
- Get portfolio state
- Update leverage
"""

import uuid
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.config import (
    DEFAULT_LEVERAGE,
    DEFAULT_STARTING_BALANCE,
    SUPPORTED_LEVERAGE,
    SUPPORTED_SYMBOLS,
    OrderSide,
    OrderType,
)
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
    reduce_only: bool = Field(default=False, description="Close position only")
    leverage: Optional[int] = Field(
        None, description="Override leverage for this trade"
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


# Temporary user_id helper (in production, this comes from JWT auth)
def get_demo_user_id() -> uuid.UUID:
    """Get a demo user ID for testing"""
    return uuid.UUID("00000000-0000-0000-0000-000000000001")


@router.post("/orders")
async def place_order(request: PlaceOrderRequest, user_id: Optional[str] = Query(None)):
    """
    Place a new trading order.
    
    For market orders, executes immediately at current price.
    """
    try:
        uid = uuid.UUID(user_id) if user_id else get_demo_user_id()
    except ValueError as err:
        raise HTTPException(
            status_code=400, detail="Invalid user_id format"
        ) from err
    
    # Validate leverage if provided
    if request.leverage and request.leverage not in SUPPORTED_LEVERAGE:
        raise HTTPException(
            status_code=400,
            detail=f"Leverage must be one of: {SUPPORTED_LEVERAGE}"
        )
    
    exchange = get_paper_exchange()
    
    order = OrderRequest(
        symbol=request.symbol,
        side=request.side,
        order_type=request.order_type,
        qty=request.qty,
        price=request.price,
        reduce_only=request.reduce_only,
        leverage=request.leverage
    )
    
    result = await exchange.submit_order(uid, order)
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.message)
    
    return {
        "success": True,
        "order_id": result.order_id,
        "filled_qty": str(result.filled_qty),
        "fill_price": str(result.fill_price),
        "fee": str(result.fee),
        "position": result.position,
        "message": result.message
    }


@router.post("/close-position")
async def close_position(
    request: ClosePositionRequest, user_id: Optional[str] = Query(None)
):
    """Close an open position (fully or partially)"""
    try:
        uid = uuid.UUID(user_id) if user_id else get_demo_user_id()
    except ValueError as err:
        raise HTTPException(
            status_code=400, detail="Invalid user_id format"
        ) from err
    
    exchange = get_paper_exchange()
    result = await exchange.close_position(uid, request.symbol, request.qty)
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.message)
    
    return {
        "success": True,
        "message": result.message,
        "position": result.position
    }


@router.get("/portfolio")
async def get_portfolio(user_id: Optional[str] = Query(None)):
    """Get current portfolio state"""
    try:
        uid = uuid.UUID(user_id) if user_id else get_demo_user_id()
    except ValueError as err:
        raise HTTPException(
            status_code=400, detail="Invalid user_id format"
        ) from err
    
    manager = get_portfolio_manager()
    portfolio = await manager.get_or_create_portfolio(uid)
    
    return portfolio.to_dict()


@router.get("/position/{symbol}")
async def get_position(symbol: str, user_id: Optional[str] = Query(None)):
    """Get position for a specific symbol"""
    try:
        uid = uuid.UUID(user_id) if user_id else get_demo_user_id()
    except ValueError as err:
        raise HTTPException(
            status_code=400, detail="Invalid user_id format"
        ) from err
    
    if symbol not in SUPPORTED_SYMBOLS:
        raise HTTPException(
            status_code=400,
            detail=f"Symbol not supported. Supported: {SUPPORTED_SYMBOLS}"
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
    request: UpdateLeverageRequest, user_id: Optional[str] = Query(None)
):
    """Update leverage for future trades"""
    try:
        uid = uuid.UUID(user_id) if user_id else get_demo_user_id()
    except ValueError as err:
        raise HTTPException(
            status_code=400, detail="Invalid user_id format"
        ) from err
    
    if request.leverage not in SUPPORTED_LEVERAGE:
        raise HTTPException(
            status_code=400,
            detail=f"Leverage must be one of: {SUPPORTED_LEVERAGE}"
        )
    
    manager = get_portfolio_manager()
    portfolio = await manager.get_or_create_portfolio(uid)
    portfolio.update_leverage(request.leverage)
    
    return {
        "success": True,
        "leverage": request.leverage,
        "message": f"Leverage updated to {request.leverage}x"
    }


@router.get("/symbols")
async def get_supported_symbols():
    """Get list of supported trading symbols"""
    return {
        "symbols": SUPPORTED_SYMBOLS,
        "leverage_options": SUPPORTED_LEVERAGE
    }


@router.get("/stats")
async def get_trading_stats():
    """Get trading engine statistics"""
    manager = get_portfolio_manager()
    return manager.get_stats()


@router.post("/reset")
async def reset_portfolio(user_id: Optional[str] = Query(None)):
    """Reset portfolio to initial state (for testing)"""
    try:
        uid = uuid.UUID(user_id) if user_id else get_demo_user_id()
    except ValueError as err:
        raise HTTPException(
            status_code=400, detail="Invalid user_id format"
        ) from err
    
    manager = get_portfolio_manager()
    
    # Remove old portfolio
    await manager.remove_portfolio(uid)
    
    # Create fresh portfolio
    portfolio = await manager.get_or_create_portfolio(
        uid,
        starting_balance=DEFAULT_STARTING_BALANCE,
        leverage=DEFAULT_LEVERAGE
    )
    
    return {
        "success": True,
        "message": "Portfolio reset successfully",
        "portfolio": portfolio.to_dict()
    }
