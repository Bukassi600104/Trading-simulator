"""
Paper Exchange - Simulated exchange for paper trading

This module provides a paper trading implementation that:
- Executes orders without real API calls
- Simulates market, limit, and stop order fills
- Calculates fees like a real exchange
- Supports stop-loss and take-profit auto-triggers
- Batch price updates for performance
"""

import asyncio
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional

from loguru import logger
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import (
    FEE_RATE,
    SUPPORTED_LEVERAGE,
    SUPPORTED_SYMBOLS,
    OrderSide,
    OrderStatus,
    OrderType,
)
from app.models.journal import JournalEntry
from app.models.order import Order
from jesse_custom.engine import PortfolioManager, UserPortfolio, get_portfolio_manager


class OrderRequest(BaseModel):
    """Order request schema"""

    symbol: str
    side: OrderSide
    order_type: OrderType = OrderType.MARKET
    qty: Decimal = Field(gt=0)
    price: Optional[Decimal] = None  # Required for limit orders
    stop_price: Optional[Decimal] = None  # Required for stop orders
    reduce_only: bool = False
    leverage: Optional[int] = None
    # Stop-loss / Take-profit attached to the order
    stop_loss: Optional[Decimal] = None
    take_profit: Optional[Decimal] = None


class OrderResult(BaseModel):
    """Order execution result"""

    success: bool
    order_id: Optional[str] = None
    message: str
    filled_qty: Optional[Decimal] = None
    fill_price: Optional[Decimal] = None
    fee: Optional[Decimal] = None
    position: Optional[dict] = None


class PendingOrder(BaseModel):
    """In-memory representation of a queued order (STOP/LIMIT)."""

    order_id: uuid.UUID
    user_id: uuid.UUID
    symbol: str
    side: OrderSide
    order_type: OrderType
    qty: Decimal
    price: Optional[Decimal] = None
    stop_price: Optional[Decimal] = None
    reduce_only: bool = False
    leverage: Optional[int] = None
    stop_loss: Optional[Decimal] = None
    take_profit: Optional[Decimal] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PaperExchange:
    """
    Paper trading exchange implementation.

    Simulates order execution with realistic behavior:
    - Market orders fill at current price immediately
    - Limit/Stop orders are queued and triggered by price updates
    - Fees are calculated and deducted
    - SL/TP are attached to positions and auto-trigger
    - Batch price updates for efficient multi-symbol processing
    """

    # Minimum price change (in basis points) to trigger PnL recalculation
    SIGNIFICANT_PRICE_CHANGE_BPS = 1  # 0.01%

    def __init__(self, portfolio_manager: Optional[PortfolioManager] = None):
        self.portfolio_manager = portfolio_manager or get_portfolio_manager()
        self.fee_rate = FEE_RATE
        self.supported_symbols = SUPPORTED_SYMBOLS
        self.supported_leverage = SUPPORTED_LEVERAGE

        # Pending orders maintained in-memory and triggered by live prices
        self._pending_lock = asyncio.Lock()
        self._pending_by_symbol: Dict[str, List[PendingOrder]] = {
            symbol: [] for symbol in self.supported_symbols
        }

        # Last prices for significant-change detection
        self._last_processed_prices: Dict[str, Decimal] = {}

        logger.info("Paper Exchange initialized")

    def validate_symbol(self, symbol: str) -> bool:
        return symbol in self.supported_symbols

    def validate_leverage(self, leverage: int) -> bool:
        return leverage in self.supported_leverage

    # ------------------------------------------------------------------
    # Order submission
    # ------------------------------------------------------------------

    async def submit_order(
        self,
        user_id: uuid.UUID,
        order: OrderRequest,
        db: Optional[AsyncSession] = None,
    ) -> OrderResult:
        """
        Submit an order for execution.

        For market orders, executes immediately at current price.
        For limit/stop orders, queues for later execution.
        """
        if not self.validate_symbol(order.symbol):
            return OrderResult(
                success=False,
                message=(
                    f"Symbol {order.symbol} not supported. "
                    f"Supported: {self.supported_symbols}"
                ),
            )

        portfolio = await self.portfolio_manager.get_or_create_portfolio(user_id)

        if portfolio.is_liquidated:
            return OrderResult(
                success=False,
                message="Portfolio is liquidated. Cannot place orders.",
            )

        if order.leverage and self.validate_leverage(order.leverage):
            portfolio.update_leverage(order.leverage)

        current_price = self.portfolio_manager.get_current_price(order.symbol)
        if current_price <= 0:
            return OrderResult(
                success=False,
                message=f"No price available for {order.symbol}. Wait for market data.",
            )

        # Validate SL/TP if provided
        if order.stop_loss is not None or order.take_profit is not None:
            validation_err = self._validate_sl_tp(order, current_price)
            if validation_err:
                return OrderResult(success=False, message=validation_err)

        if order.order_type == OrderType.MARKET:
            return await self._execute_market_order(
                portfolio, order, current_price, db
            )

        if order.order_type == OrderType.LIMIT:
            return await self._handle_limit_order(
                user_id, portfolio, order, db
            )

        if order.order_type == OrderType.STOP:
            return await self._handle_stop_order(
                user_id, portfolio, order, current_price, db
            )

        return OrderResult(
            success=False,
            message=f"Order type {order.order_type} not supported",
        )

    def _validate_sl_tp(
        self, order: OrderRequest, current_price: Decimal
    ) -> Optional[str]:
        """Validate stop-loss and take-profit prices make sense."""
        if order.side == OrderSide.BUY:
            # Long position: SL below entry, TP above entry
            if order.stop_loss is not None and order.stop_loss >= current_price:
                return "Stop-loss for BUY must be below current price"
            if (
                order.take_profit is not None
                and order.take_profit <= current_price
            ):
                return "Take-profit for BUY must be above current price"
        else:
            # Short position: SL above entry, TP below entry
            if order.stop_loss is not None and order.stop_loss <= current_price:
                return "Stop-loss for SELL must be above current price"
            if (
                order.take_profit is not None
                and order.take_profit >= current_price
            ):
                return "Take-profit for SELL must be below current price"
        return None

    # ------------------------------------------------------------------
    # Market order execution
    # ------------------------------------------------------------------

    async def _execute_market_order(
        self,
        portfolio: UserPortfolio,
        order: OrderRequest,
        fill_price: Decimal,
        db: Optional[AsyncSession] = None,
        order_id: Optional[uuid.UUID] = None,
    ) -> OrderResult:
        """Execute a market order immediately at current price."""
        order_id = order_id or uuid.uuid4()
        fee = order.qty * fill_price * self.fee_rate

        if order.reduce_only:
            position_before = portfolio.get_position(order.symbol)
            entry_price = (
                position_before.entry_price if position_before else Decimal("0")
            )
            entry_time = (
                position_before.opened_at
                if position_before
                else datetime.utcnow()
            )
            side_before = (
                position_before.side if position_before else "FLAT"
            )

            success, message, realized_pnl = portfolio.close_position(
                symbol=order.symbol, qty=order.qty, price=fill_price
            )

            if success:
                position = portfolio.get_position(order.symbol)

                if db:
                    existing = await db.get(Order, order_id)
                    if existing:
                        existing.filled_qty = order.qty
                        existing.avg_fill_price = fill_price
                        existing.status = OrderStatus.FILLED
                        existing.filled_at = datetime.utcnow()
                    else:
                        db_order = Order(
                            id=order_id,
                            portfolio_id=portfolio.id,
                            symbol=order.symbol,
                            side=order.side,
                            order_type=order.order_type,
                            qty=order.qty,
                            price=None,
                            filled_qty=order.qty,
                            avg_fill_price=fill_price,
                            status=OrderStatus.FILLED,
                            reduce_only=order.reduce_only,
                            filled_at=datetime.utcnow(),
                        )
                        db.add(db_order)

                    margin_used = (order.qty * entry_price) / portfolio.leverage
                    pnl_percent = Decimal("0")
                    if margin_used > 0:
                        pnl_percent = (realized_pnl / margin_used) * 100

                    journal_entry = JournalEntry(
                        portfolio_id=portfolio.id,
                        symbol=order.symbol,
                        side=side_before,
                        entry_price=entry_price,
                        exit_price=fill_price,
                        qty=order.qty,
                        pnl=realized_pnl,
                        pnl_percent=pnl_percent,
                        entry_time=entry_time,
                        exit_time=datetime.utcnow(),
                    )
                    db.add(journal_entry)

                    try:
                        await db.commit()
                    except Exception as e:
                        logger.error(f"Failed to persist order: {e}")
                        await db.rollback()

                return OrderResult(
                    success=True,
                    order_id=str(order_id),
                    message=message,
                    filled_qty=order.qty,
                    fill_price=fill_price,
                    fee=fee,
                    position=position.to_dict() if position else None,
                )
            else:
                return OrderResult(success=False, message=message)
        else:
            # Open or increase position
            success, message, position = portfolio.open_position(
                symbol=order.symbol,
                side=order.side,
                qty=order.qty,
                price=fill_price,
                stop_loss=getattr(order, "stop_loss", None),
                take_profit=getattr(order, "take_profit", None),
            )

            if success:
                if db:
                    existing = await db.get(Order, order_id)
                    if existing:
                        existing.filled_qty = order.qty
                        existing.avg_fill_price = fill_price
                        existing.status = OrderStatus.FILLED
                        existing.filled_at = datetime.utcnow()
                    else:
                        db_order = Order(
                            id=order_id,
                            portfolio_id=portfolio.id,
                            symbol=order.symbol,
                            side=order.side,
                            order_type=order.order_type,
                            qty=order.qty,
                            price=None,
                            filled_qty=order.qty,
                            avg_fill_price=fill_price,
                            status=OrderStatus.FILLED,
                            reduce_only=order.reduce_only,
                            filled_at=datetime.utcnow(),
                        )
                        db.add(db_order)
                    try:
                        await db.commit()
                    except Exception as e:
                        logger.error(f"Failed to persist order: {e}")
                        await db.rollback()

                return OrderResult(
                    success=True,
                    order_id=str(order_id),
                    message=message,
                    filled_qty=order.qty,
                    fill_price=fill_price,
                    fee=fee,
                    position=position.to_dict() if position else None,
                )
            else:
                return OrderResult(success=False, message=message)

    # ------------------------------------------------------------------
    # Limit / Stop order handling
    # ------------------------------------------------------------------

    async def _handle_limit_order(
        self,
        user_id: uuid.UUID,
        portfolio: UserPortfolio,
        order: OrderRequest,
        db: Optional[AsyncSession] = None,
    ) -> OrderResult:
        """Handle limit order submission."""
        if order.price is None:
            return OrderResult(
                success=False, message="Limit orders require a price"
            )

        current_price = self.portfolio_manager.get_current_price(order.symbol)

        should_fill = False
        if order.side == OrderSide.BUY and current_price <= order.price:
            should_fill = True
        elif order.side == OrderSide.SELL and current_price >= order.price:
            should_fill = True

        if should_fill:
            return await self._execute_market_order(
                portfolio, order, current_price, db
            )

        order_id = uuid.uuid4()

        if db:
            db_order = Order(
                id=order_id,
                portfolio_id=portfolio.id,
                symbol=order.symbol,
                side=order.side,
                order_type=order.order_type,
                qty=order.qty,
                price=order.price,
                filled_qty=Decimal("0"),
                avg_fill_price=None,
                status=OrderStatus.OPEN,
                reduce_only=order.reduce_only,
            )
            db.add(db_order)
            try:
                await db.commit()
            except Exception as e:
                logger.error(f"Failed to persist queued limit order: {e}")
                await db.rollback()

        async with self._pending_lock:
            self._pending_by_symbol.setdefault(order.symbol, []).append(
                PendingOrder(
                    order_id=order_id,
                    user_id=user_id,
                    symbol=order.symbol,
                    side=order.side,
                    order_type=order.order_type,
                    qty=order.qty,
                    price=order.price,
                    reduce_only=order.reduce_only,
                    leverage=order.leverage,
                    stop_loss=order.stop_loss,
                    take_profit=order.take_profit,
                )
            )

        return OrderResult(
            success=True,
            order_id=str(order_id),
            message="Limit order queued",
        )

    async def _handle_stop_order(
        self,
        user_id: uuid.UUID,
        portfolio: UserPortfolio,
        order: OrderRequest,
        current_price: Decimal,
        db: Optional[AsyncSession] = None,
    ) -> OrderResult:
        """Queue or execute a stop-market order based on current price."""
        if order.stop_price is None:
            return OrderResult(
                success=False, message="Stop orders require stop_price"
            )

        should_trigger = False
        if order.side == OrderSide.BUY and current_price >= order.stop_price:
            should_trigger = True
        elif order.side == OrderSide.SELL and current_price <= order.stop_price:
            should_trigger = True

        if should_trigger:
            return await self._execute_market_order(
                portfolio, order, current_price, db
            )

        order_id = uuid.uuid4()

        if db:
            db_order = Order(
                id=order_id,
                portfolio_id=portfolio.id,
                symbol=order.symbol,
                side=order.side,
                order_type=order.order_type,
                qty=order.qty,
                price=order.stop_price,
                filled_qty=Decimal("0"),
                avg_fill_price=None,
                status=OrderStatus.OPEN,
                reduce_only=order.reduce_only,
            )
            db.add(db_order)
            try:
                await db.commit()
            except Exception as e:
                logger.error(f"Failed to persist queued stop order: {e}")
                await db.rollback()

        async with self._pending_lock:
            self._pending_by_symbol.setdefault(order.symbol, []).append(
                PendingOrder(
                    order_id=order_id,
                    user_id=user_id,
                    symbol=order.symbol,
                    side=order.side,
                    order_type=order.order_type,
                    qty=order.qty,
                    stop_price=order.stop_price,
                    reduce_only=order.reduce_only,
                    leverage=order.leverage,
                    stop_loss=order.stop_loss,
                    take_profit=order.take_profit,
                )
            )

        return OrderResult(
            success=True,
            order_id=str(order_id),
            message="Stop order queued",
        )

    # ------------------------------------------------------------------
    # Price update handler (triggers pending orders + SL/TP)
    # ------------------------------------------------------------------

    async def on_price_update(self, symbol: str, price: Decimal) -> None:
        """
        Trigger queued STOP/LIMIT orders and SL/TP for a symbol.

        Includes a significance check: skip processing if the price
        has not moved meaningfully since the last update.
        """
        # Significance check
        last = self._last_processed_prices.get(symbol)
        if last and last > 0:
            change_bps = abs(price - last) / last * Decimal("10000")
            if change_bps < self.SIGNIFICANT_PRICE_CHANGE_BPS:
                return
        self._last_processed_prices[symbol] = price

        # 1. Check and trigger pending orders
        await self._trigger_pending_orders(symbol, price)

        # 2. Check SL/TP on all active positions for this symbol
        await self._trigger_sl_tp(symbol, price)

    async def _trigger_pending_orders(
        self, symbol: str, price: Decimal
    ) -> None:
        """Trigger and fill queued STOP/LIMIT orders for a symbol."""
        async with self._pending_lock:
            pending = list(self._pending_by_symbol.get(symbol, []))
            if not pending:
                return

        triggered: List[PendingOrder] = []
        remaining: List[PendingOrder] = []

        for po in pending:
            if po.order_type == OrderType.STOP:
                if po.stop_price is None:
                    remaining.append(po)
                    continue
                if po.side == OrderSide.BUY and price >= po.stop_price:
                    triggered.append(po)
                elif po.side == OrderSide.SELL and price <= po.stop_price:
                    triggered.append(po)
                else:
                    remaining.append(po)
            elif po.order_type == OrderType.LIMIT:
                if po.price is None:
                    remaining.append(po)
                    continue
                if po.side == OrderSide.BUY and price <= po.price:
                    triggered.append(po)
                elif po.side == OrderSide.SELL and price >= po.price:
                    triggered.append(po)
                else:
                    remaining.append(po)
            else:
                remaining.append(po)

        if not triggered:
            return

        async with self._pending_lock:
            triggered_ids = {t.order_id for t in triggered}
            self._pending_by_symbol[symbol] = [
                po
                for po in self._pending_by_symbol.get(symbol, [])
                if po.order_id not in triggered_ids
            ]

        from app.core.database import async_session_maker

        async with async_session_maker() as session:
            for po in triggered:
                portfolio = (
                    await self.portfolio_manager.get_or_create_portfolio(
                        po.user_id
                    )
                )
                if po.leverage and self.validate_leverage(po.leverage):
                    portfolio.update_leverage(po.leverage)

                order = OrderRequest(
                    symbol=po.symbol,
                    side=po.side,
                    order_type=po.order_type,
                    qty=po.qty,
                    price=po.price,
                    stop_price=po.stop_price,
                    reduce_only=po.reduce_only,
                    leverage=po.leverage,
                    stop_loss=po.stop_loss,
                    take_profit=po.take_profit,
                )

                await self._execute_market_order(
                    portfolio=portfolio,
                    order=order,
                    fill_price=price,
                    db=session,
                    order_id=po.order_id,
                )

    async def _trigger_sl_tp(self, symbol: str, price: Decimal) -> None:
        """
        Check all active portfolios for SL/TP triggers on a symbol.
        Automatically closes positions when SL or TP is hit.
        """
        pm = self.portfolio_manager
        positions_to_close: List[tuple] = []  # (user_id, trigger_type)

        # Read-only scan first (no lock needed for read)
        for user_id, portfolio in list(pm._portfolios.items()):
            if not portfolio.is_active:
                continue
            position = portfolio.get_position(symbol)
            if not position or not position.is_open:
                continue

            if position.check_stop_loss():
                positions_to_close.append((user_id, "stop_loss"))
            elif position.check_take_profit():
                positions_to_close.append((user_id, "take_profit"))

        if not positions_to_close:
            return

        from app.core.database import async_session_maker

        async with async_session_maker() as session:
            for user_id, trigger_type in positions_to_close:
                portfolio = pm.get_portfolio(user_id)
                if not portfolio:
                    continue
                position = portfolio.get_position(symbol)
                if not position or not position.is_open:
                    continue

                close_side = (
                    OrderSide.SELL if position.is_long else OrderSide.BUY
                )
                close_order = OrderRequest(
                    symbol=symbol,
                    side=close_side,
                    order_type=OrderType.MARKET,
                    qty=position.qty,
                    reduce_only=True,
                )

                result = await self._execute_market_order(
                    portfolio=portfolio,
                    order=close_order,
                    fill_price=price,
                    db=session,
                )

                if result.success:
                    logger.info(
                        f"{trigger_type.upper()} triggered for user "
                        f"{user_id} on {symbol} @ {price}"
                    )

    # ------------------------------------------------------------------
    # Batch price update (performance optimization)
    # ------------------------------------------------------------------

    async def on_batch_price_update(
        self, prices: Dict[str, Decimal]
    ) -> None:
        """
        Process multiple symbol price updates in a single pass.
        More efficient than calling on_price_update individually.
        """
        for symbol, price in prices.items():
            if symbol in self.supported_symbols:
                await self.on_price_update(symbol, price)

    # ------------------------------------------------------------------
    # Position management
    # ------------------------------------------------------------------

    async def close_position(
        self,
        user_id: uuid.UUID,
        symbol: str,
        qty: Optional[Decimal] = None,
    ) -> OrderResult:
        """Convenience method to close a position."""
        portfolio = self.portfolio_manager.get_portfolio(user_id)
        if not portfolio:
            return OrderResult(success=False, message="Portfolio not found")

        position = portfolio.get_position(symbol)
        if not position or not position.is_open:
            return OrderResult(
                success=False, message="No open position to close"
            )

        close_side = OrderSide.SELL if position.is_long else OrderSide.BUY
        close_qty = qty or position.qty

        order = OrderRequest(
            symbol=symbol,
            side=close_side,
            order_type=OrderType.MARKET,
            qty=close_qty,
            reduce_only=True,
        )

        return await self.submit_order(user_id, order)

    async def get_portfolio_state(
        self, user_id: uuid.UUID
    ) -> Optional[dict]:
        """Get current portfolio state for a user."""
        portfolio = self.portfolio_manager.get_portfolio(user_id)
        if portfolio:
            return portfolio.to_dict()
        return None

    async def cancel_order(
        self, user_id: uuid.UUID, order_id: uuid.UUID
    ) -> OrderResult:
        """Cancel a pending order."""
        async with self._pending_lock:
            for symbol, orders in self._pending_by_symbol.items():
                for i, po in enumerate(orders):
                    if po.order_id == order_id and po.user_id == user_id:
                        orders.pop(i)

                        # Update DB status
                        from app.core.database import async_session_maker

                        try:
                            async with async_session_maker() as session:
                                db_order = await session.get(Order, order_id)
                                if db_order:
                                    db_order.status = OrderStatus.CANCELED
                                    db_order.canceled_at = datetime.utcnow()
                                    await session.commit()
                        except Exception as e:
                            logger.error(
                                f"Failed to cancel order in DB: {e}"
                            )

                        return OrderResult(
                            success=True,
                            order_id=str(order_id),
                            message="Order canceled",
                        )

        return OrderResult(
            success=False, message="Order not found or already filled"
        )


# Global singleton instance
paper_exchange: Optional[PaperExchange] = None


def get_paper_exchange() -> PaperExchange:
    """Get or create the global paper exchange instance."""
    global paper_exchange
    if paper_exchange is None:
        paper_exchange = PaperExchange()
    return paper_exchange
