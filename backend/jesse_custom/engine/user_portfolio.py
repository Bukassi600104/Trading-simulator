"""
User Portfolio - In-memory portfolio state for real-time trading

Adapted from Jesse's FuturesExchange but designed for multi-user simulation.
Each UserPortfolio manages one user's balance, margin, and positions.

Enhancements:
- SL/TP passthrough to positions
- Enhanced liquidation with margin call warnings
- Proper maintenance margin tracking
"""

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional

from app.core.config import (
    DEFAULT_LEVERAGE,
    DEFAULT_STARTING_BALANCE,
    FEE_RATE,
    SUPPORTED_SYMBOLS,
    OrderSide,
    PositionSide,
)

from .user_position import UserPosition


@dataclass
class UserPortfolio:
    """
    In-memory representation of a user's trading portfolio.

    This class handles:
    - Balance and margin calculations
    - Position management for multiple symbols
    - Fee deductions
    - Liquidation checking
    - Margin call warnings
    """

    id: uuid.UUID = field(default_factory=uuid.uuid4)
    user_id: uuid.UUID = None

    # Balance tracking
    balance: Decimal = DEFAULT_STARTING_BALANCE
    starting_balance: Decimal = DEFAULT_STARTING_BALANCE

    # Settings
    leverage: int = DEFAULT_LEVERAGE
    fee_rate: Decimal = FEE_RATE

    # State
    is_liquidated: bool = False
    is_active: bool = True

    # For Prop Mode - tracks highest equity
    max_equity_watermark: Decimal = DEFAULT_STARTING_BALANCE

    # Positions by symbol
    positions: Dict[str, UserPosition] = field(default_factory=dict)

    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def __post_init__(self):
        """Initialize positions for all supported symbols."""
        for symbol in SUPPORTED_SYMBOLS:
            if symbol not in self.positions:
                self.positions[symbol] = UserPosition(
                    portfolio_id=self.id,
                    symbol=symbol,
                    leverage=self.leverage,
                )

    @property
    def equity(self) -> Decimal:
        """Calculate equity = balance + total unrealized PnL."""
        total_unrealized = sum(
            p.unrealized_pnl for p in self.positions.values() if p.is_open
        )
        return self.balance + total_unrealized

    @property
    def total_margin_used(self) -> Decimal:
        """Total margin locked in open positions."""
        return sum(
            p.margin_used for p in self.positions.values() if p.is_open
        )

    @property
    def total_maintenance_margin(self) -> Decimal:
        """Total maintenance margin across all open positions."""
        return sum(
            p.maintenance_margin for p in self.positions.values() if p.is_open
        )

    @property
    def available_margin(self) -> Decimal:
        """Available margin for new positions."""
        return self.equity - self.total_margin_used

    @property
    def margin_ratio(self) -> Decimal:
        """Margin ratio (used margin / equity)."""
        if self.equity <= 0:
            return Decimal("1")
        return self.total_margin_used / self.equity

    @property
    def total_unrealized_pnl(self) -> Decimal:
        """Sum of all unrealized PnL across positions."""
        return sum(p.unrealized_pnl for p in self.positions.values())

    @property
    def total_realized_pnl(self) -> Decimal:
        """Sum of all realized PnL across positions."""
        return sum(p.realized_pnl for p in self.positions.values())

    @property
    def current_drawdown(self) -> Decimal:
        """Current drawdown from peak equity."""
        if self.max_equity_watermark <= 0:
            return Decimal("0")
        drawdown = (
            (self.max_equity_watermark - self.equity)
            / self.max_equity_watermark
            * 100
        )
        return drawdown

    @property
    def has_margin_call(self) -> bool:
        """True if any position has a margin call warning."""
        return any(
            p.margin_call_warning
            for p in self.positions.values()
            if p.is_open
        )

    @property
    def open_position_count(self) -> int:
        """Number of currently open positions."""
        return sum(1 for p in self.positions.values() if p.is_open)

    def get_position(self, symbol: str) -> Optional[UserPosition]:
        """Get position for a specific symbol."""
        return self.positions.get(symbol)

    def update_leverage(self, new_leverage: int) -> None:
        """Update leverage for future positions."""
        self.leverage = new_leverage
        self.updated_at = datetime.utcnow()

    def can_open_position(
        self, symbol: str, qty: Decimal, price: Decimal
    ) -> bool:
        """Check if we have enough margin to open a position."""
        if self.is_liquidated:
            return False

        required_margin = (qty * price) / Decimal(self.leverage)
        fee = qty * price * self.fee_rate

        return self.available_margin >= (required_margin + fee)

    def open_position(
        self,
        symbol: str,
        side: OrderSide,
        qty: Decimal,
        price: Decimal,
        stop_loss: Optional[Decimal] = None,
        take_profit: Optional[Decimal] = None,
    ) -> tuple:
        """
        Open a new position or add to existing position.

        Returns: (success, message, position)
        """
        if self.is_liquidated:
            return False, "Portfolio is liquidated", None

        position = self.positions.get(symbol)
        if not position:
            return False, f"Symbol {symbol} not supported", None

        # Calculate margin and fees
        required_margin = (qty * price) / Decimal(self.leverage)
        fee = qty * price * self.fee_rate
        total_cost = required_margin + fee

        if self.available_margin < total_cost:
            msg = (
                f"Insufficient margin. Required: {total_cost}, "
                f"Available: {self.available_margin}"
            )
            return False, msg, None

        # Deduct fee from balance
        self.balance -= fee

        # Determine position side
        pos_side = (
            PositionSide.LONG if side == OrderSide.BUY else PositionSide.SHORT
        )

        # Open or increase position
        if position.is_open:
            if position.side == pos_side:
                # Same side - increase position
                position.increase_position(qty, price)
                # Update SL/TP if provided
                if stop_loss is not None:
                    position.stop_loss_price = stop_loss
                if take_profit is not None:
                    position.take_profit_price = take_profit
            else:
                # Opposite side - reduce or flip position
                if qty >= position.qty:
                    realized = position.close_position(price)
                    self.balance += realized
                    remaining_qty = qty - position.qty
                    if remaining_qty > 0:
                        position.open_position(
                            pos_side,
                            remaining_qty,
                            price,
                            self.leverage,
                            stop_loss=stop_loss,
                            take_profit=take_profit,
                        )
                else:
                    realized = position.reduce_position(qty, price)
                    self.balance += realized
        else:
            position.open_position(
                pos_side,
                qty,
                price,
                self.leverage,
                stop_loss=stop_loss,
                take_profit=take_profit,
            )

        self._update_watermark()
        self.updated_at = datetime.utcnow()

        return True, "Position opened successfully", position

    def close_position(
        self,
        symbol: str,
        qty: Optional[Decimal] = None,
        price: Decimal = None,
    ) -> tuple:
        """
        Close a position (fully or partially).

        Returns: (success, message, realized_pnl)
        """
        position = self.positions.get(symbol)
        if not position or not position.is_open:
            return False, "No open position to close", Decimal("0")

        if price is None:
            price = position.current_price

        close_qty = qty if qty and qty < position.qty else position.qty
        fee = close_qty * price * self.fee_rate

        if qty and qty < position.qty:
            realized = position.reduce_position(qty, price)
        else:
            realized = position.close_position(price)

        self.balance += realized - fee

        self._update_watermark()
        self.updated_at = datetime.utcnow()

        return True, "Position closed successfully", realized

    def update_prices(self, prices: Dict[str, Decimal]) -> List[str]:
        """
        Update all position prices and check for liquidations.

        Returns list of liquidated symbols.
        """
        liquidated_symbols = []

        for symbol, price in prices.items():
            position = self.positions.get(symbol)
            if position and position.is_open:
                position.update_price(price)

                # Check liquidation
                if position.check_liquidation():
                    self._liquidate_position(symbol)
                    liquidated_symbols.append(symbol)

        self._update_watermark()

        # Check Prop Drawdown (5% Max Trailing)
        if self.check_prop_failure():
            self.is_liquidated = True
            self.is_active = False

        return liquidated_symbols

    def check_prop_failure(self) -> bool:
        """
        Check if portfolio has breached prop firm rules.
        Rule: Equity < High Watermark * 0.95 (5% Max Trailing Drawdown)
        """
        drawdown_limit = self.max_equity_watermark * Decimal("0.95")
        return self.equity < drawdown_limit

    def _liquidate_position(self, symbol: str) -> None:
        """
        Handle position liquidation.

        Uses maintenance margin for proper loss calculation.
        """
        position = self.positions.get(symbol)
        if not position:
            return

        # In liquidation, the position is closed at liquidation price
        # and any remaining margin is lost
        liq_loss = position.margin_used + position.unrealized_pnl
        position.close_position(
            position.liquidation_price or position.current_price
        )

        self.balance -= abs(liq_loss)

        # Check if entire account should be liquidated
        if self.balance <= 0 or self.equity <= 0:
            self.is_liquidated = True
            self.is_active = False

    def _update_watermark(self) -> None:
        """Update max equity watermark for drawdown tracking."""
        if self.equity > self.max_equity_watermark:
            self.max_equity_watermark = self.equity

    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id) if self.user_id else None,
            "balance": str(self.balance),
            "equity": str(self.equity),
            "available_margin": str(self.available_margin),
            "total_margin_used": str(self.total_margin_used),
            "total_maintenance_margin": str(self.total_maintenance_margin),
            "leverage": self.leverage,
            "is_liquidated": self.is_liquidated,
            "is_active": self.is_active,
            "has_margin_call": self.has_margin_call,
            "open_position_count": self.open_position_count,
            "total_unrealized_pnl": str(self.total_unrealized_pnl),
            "total_realized_pnl": str(self.total_realized_pnl),
            "current_drawdown": str(self.current_drawdown),
            "positions": {
                symbol: pos.to_dict()
                for symbol, pos in self.positions.items()
            },
        }
