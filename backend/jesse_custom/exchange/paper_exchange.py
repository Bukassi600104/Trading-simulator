"""
Paper Exchange - Simulated exchange for paper trading

This module provides a paper trading implementation that:
- Executes orders without real API calls
- Simulates market and limit order fills
- Calculates fees like a real exchange
"""

import uuid
from decimal import Decimal
from typing import Optional

from loguru import logger
from pydantic import BaseModel, Field

from app.core.config import (
    FEE_RATE,
    SUPPORTED_LEVERAGE,
    SUPPORTED_SYMBOLS,
    OrderSide,
    OrderType,
)
from jesse_custom.engine import PortfolioManager, UserPortfolio, get_portfolio_manager


class OrderRequest(BaseModel):
    """Order request schema"""
    symbol: str
    side: OrderSide
    order_type: OrderType = OrderType.MARKET
    qty: Decimal = Field(gt=0)
    price: Optional[Decimal] = None  # Required for limit orders
    reduce_only: bool = False
    leverage: Optional[int] = None  # Override portfolio leverage


class OrderResult(BaseModel):
    """Order execution result"""
    success: bool
    order_id: Optional[str] = None
    message: str
    filled_qty: Optional[Decimal] = None
    fill_price: Optional[Decimal] = None
    fee: Optional[Decimal] = None
    position: Optional[dict] = None


class PaperExchange:
    """
    Paper trading exchange implementation.
    
    Simulates order execution with realistic behavior:
    - Market orders fill at current price immediately
    - Limit orders would need to be managed separately (not implemented yet)
    - Fees are calculated and deducted
    - Position updates are handled through PortfolioManager
    """
    
    def __init__(self, portfolio_manager: Optional[PortfolioManager] = None):
        self.portfolio_manager = portfolio_manager or get_portfolio_manager()
        self.fee_rate = FEE_RATE
        self.supported_symbols = SUPPORTED_SYMBOLS
        self.supported_leverage = SUPPORTED_LEVERAGE
        
        logger.info("📜 Paper Exchange initialized")
    
    def validate_symbol(self, symbol: str) -> bool:
        """Check if symbol is supported"""
        return symbol in self.supported_symbols
    
    def validate_leverage(self, leverage: int) -> bool:
        """Check if leverage is supported"""
        return leverage in self.supported_leverage
    
    async def submit_order(
        self,
        user_id: uuid.UUID,
        order: OrderRequest
    ) -> OrderResult:
        """
        Submit an order for execution.
        
        For market orders, executes immediately at current price.
        For limit orders, would need order book management (future feature).
        """
        # Validate symbol
        if not self.validate_symbol(order.symbol):
            return OrderResult(
                success=False,
                message=(
                    f"Symbol {order.symbol} not supported. "
                    f"Supported: {self.supported_symbols}"
                )
            )
        
        # Get or create portfolio
        portfolio = await self.portfolio_manager.get_or_create_portfolio(user_id)
        
        if portfolio.is_liquidated:
            return OrderResult(
                success=False,
                message="Portfolio is liquidated. Cannot place orders."
            )
        
        # Update leverage if specified
        if order.leverage and self.validate_leverage(order.leverage):
            portfolio.update_leverage(order.leverage)
        
        # Get current price
        current_price = self.portfolio_manager.get_current_price(order.symbol)
        if current_price <= 0:
            return OrderResult(
                success=False,
                message=f"No price available for {order.symbol}. Wait for market data."
            )
        
        # Handle based on order type
        if order.order_type == OrderType.MARKET:
            return await self._execute_market_order(portfolio, order, current_price)
        elif order.order_type == OrderType.LIMIT:
            return await self._handle_limit_order(portfolio, order)
        else:
            return OrderResult(
                success=False,
                message=f"Order type {order.order_type} not supported yet"
            )
    
    async def _execute_market_order(
        self,
        portfolio: UserPortfolio,
        order: OrderRequest,
        fill_price: Decimal
    ) -> OrderResult:
        """Execute a market order immediately at current price"""
        
        order_id = str(uuid.uuid4())
        
        if order.reduce_only:
            # Close position
            success, message, realized_pnl = portfolio.close_position(
                symbol=order.symbol,
                qty=order.qty,
                price=fill_price
            )
            
            if success:
                position = portfolio.get_position(order.symbol)
                return OrderResult(
                    success=True,
                    order_id=order_id,
                    message=message,
                    filled_qty=order.qty,
                    fill_price=fill_price,
                    fee=order.qty * fill_price * self.fee_rate,
                    position=position.to_dict() if position else None
                )
            else:
                return OrderResult(success=False, message=message)
        else:
            # Open or increase position
            success, message, position = portfolio.open_position(
                symbol=order.symbol,
                side=order.side,
                qty=order.qty,
                price=fill_price
            )
            
            if success:
                return OrderResult(
                    success=True,
                    order_id=order_id,
                    message=message,
                    filled_qty=order.qty,
                    fill_price=fill_price,
                    fee=order.qty * fill_price * self.fee_rate,
                    position=position.to_dict() if position else None
                )
            else:
                return OrderResult(success=False, message=message)
    
    async def _handle_limit_order(
        self,
        portfolio: UserPortfolio,
        order: OrderRequest
    ) -> OrderResult:
        """
        Handle limit order submission.
        
        Note: Full limit order book is a future feature.
        For now, we'll execute if price is favorable.
        """
        if order.price is None:
            return OrderResult(
                success=False,
                message="Limit orders require a price"
            )
        
        current_price = self.portfolio_manager.get_current_price(order.symbol)
        
        # Check if limit order would fill immediately
        should_fill = False
        if order.side == OrderSide.BUY and current_price <= order.price:
            should_fill = True
        elif order.side == OrderSide.SELL and current_price >= order.price:
            should_fill = True
        
        if should_fill:
            return await self._execute_market_order(portfolio, order, current_price)
        
        # Otherwise, order would be pending (not implemented)
        return OrderResult(
            success=False,
            message=(
                "Limit order queuing not yet implemented. "
                "Use market orders or set price at current market level."
            )
        )
    
    async def close_position(
        self,
        user_id: uuid.UUID,
        symbol: str,
        qty: Optional[Decimal] = None
    ) -> OrderResult:
        """Convenience method to close a position"""
        portfolio = self.portfolio_manager.get_portfolio(user_id)
        if not portfolio:
            return OrderResult(success=False, message="Portfolio not found")
        
        position = portfolio.get_position(symbol)
        if not position or not position.is_open:
            return OrderResult(success=False, message="No open position to close")
        
        # Create close order
        close_side = OrderSide.SELL if position.is_long else OrderSide.BUY
        close_qty = qty or position.qty
        
        order = OrderRequest(
            symbol=symbol,
            side=close_side,
            order_type=OrderType.MARKET,
            qty=close_qty,
            reduce_only=True
        )
        
        return await self.submit_order(user_id, order)
    
    async def get_portfolio_state(self, user_id: uuid.UUID) -> Optional[dict]:
        """Get current portfolio state for a user"""
        portfolio = self.portfolio_manager.get_portfolio(user_id)
        if portfolio:
            return portfolio.to_dict()
        return None


# Global singleton instance
paper_exchange: Optional[PaperExchange] = None


def get_paper_exchange() -> PaperExchange:
    """Get or create the global paper exchange instance"""
    global paper_exchange
    if paper_exchange is None:
        paper_exchange = PaperExchange()
    return paper_exchange
