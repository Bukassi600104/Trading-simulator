"""
User Position - In-memory position state for real-time PnL updates

This is adapted from Jesse's Position model but designed for multi-user support.
Each UserPosition tracks a single symbol position for one user.

Enhancements:
- Stop-loss and take-profit triggers
- Maintenance margin and margin call warnings
- Proper partial fill handling
"""

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Optional

from app.core.config import MAINTENANCE_MARGIN_RATE, MARGIN_CALL_THRESHOLD, PositionSide


@dataclass
class UserPosition:
    """
    In-memory representation of a user's position for real-time updates.

    This is updated on every price tick and periodically synced to database.
    """

    id: uuid.UUID = field(default_factory=uuid.uuid4)
    portfolio_id: uuid.UUID = None
    symbol: str = ""
    side: PositionSide = PositionSide.FLAT

    # Position data
    qty: Decimal = Decimal("0")
    entry_price: Decimal = Decimal("0")
    current_price: Decimal = Decimal("0")

    # PnL tracking
    unrealized_pnl: Decimal = Decimal("0")
    realized_pnl: Decimal = Decimal("0")

    # Risk parameters
    leverage: int = 10
    liquidation_price: Optional[Decimal] = None

    # Stop-loss / Take-profit (set by user, auto-triggered)
    stop_loss_price: Optional[Decimal] = None
    take_profit_price: Optional[Decimal] = None

    # Margin call state
    margin_call_warning: bool = False

    # Timestamps
    opened_at: Optional[datetime] = None

    @property
    def is_open(self) -> bool:
        return self.side != PositionSide.FLAT and self.qty > 0

    @property
    def is_long(self) -> bool:
        return self.side == PositionSide.LONG

    @property
    def is_short(self) -> bool:
        return self.side == PositionSide.SHORT

    @property
    def value(self) -> Decimal:
        """Position value at current price."""
        return abs(self.qty) * self.current_price

    @property
    def margin_used(self) -> Decimal:
        """Initial margin for this position."""
        if self.entry_price and self.qty:
            return abs(self.qty) * self.entry_price / Decimal(self.leverage)
        return Decimal("0")

    @property
    def maintenance_margin(self) -> Decimal:
        """Maintenance margin required to keep position open."""
        if self.entry_price and self.qty:
            return abs(self.qty) * self.entry_price * MAINTENANCE_MARGIN_RATE
        return Decimal("0")

    @property
    def margin_ratio_position(self) -> Decimal:
        """
        How close the position is to liquidation.
        Returns a value from 0 (safe) to 1 (liquidated).
        """
        if not self.is_open or not self.margin_used:
            return Decimal("0")
        loss = -self.unrealized_pnl if self.unrealized_pnl < 0 else Decimal("0")
        return loss / self.margin_used

    @property
    def roi_percent(self) -> Decimal:
        """Return on investment percentage."""
        if self.margin_used > 0:
            return (self.unrealized_pnl / self.margin_used) * 100
        return Decimal("0")

    def update_price(self, new_price: Decimal) -> None:
        """Update current price and recalculate unrealized PnL."""
        self.current_price = new_price
        self._calculate_pnl()
        self._check_margin_call()

    def _calculate_pnl(self) -> None:
        """Calculate unrealized PnL based on current price."""
        if not self.is_open or not self.entry_price:
            self.unrealized_pnl = Decimal("0")
            return

        price_diff = self.current_price - self.entry_price
        if self.is_short:
            price_diff = -price_diff

        self.unrealized_pnl = price_diff * abs(self.qty)

    def _check_margin_call(self) -> None:
        """
        Check if position is approaching liquidation.
        Issues margin call warning at MARGIN_CALL_THRESHOLD (80%) of
        the distance from entry to liquidation.
        """
        if not self.is_open or not self.liquidation_price:
            self.margin_call_warning = False
            return

        if self.is_long:
            total_range = self.entry_price - self.liquidation_price
            if total_range <= 0:
                self.margin_call_warning = False
                return
            distance_to_liq = self.current_price - self.liquidation_price
            ratio = Decimal("1") - (distance_to_liq / total_range)
        else:
            total_range = self.liquidation_price - self.entry_price
            if total_range <= 0:
                self.margin_call_warning = False
                return
            distance_to_liq = self.liquidation_price - self.current_price
            ratio = Decimal("1") - (distance_to_liq / total_range)

        self.margin_call_warning = ratio >= MARGIN_CALL_THRESHOLD

    def check_stop_loss(self) -> bool:
        """Check if stop-loss should be triggered at current price."""
        if not self.is_open or self.stop_loss_price is None:
            return False
        if self.is_long:
            return self.current_price <= self.stop_loss_price
        else:
            return self.current_price >= self.stop_loss_price

    def check_take_profit(self) -> bool:
        """Check if take-profit should be triggered at current price."""
        if not self.is_open or self.take_profit_price is None:
            return False
        if self.is_long:
            return self.current_price >= self.take_profit_price
        else:
            return self.current_price <= self.take_profit_price

    def open_position(
        self,
        side: PositionSide,
        qty: Decimal,
        price: Decimal,
        leverage: int,
        stop_loss: Optional[Decimal] = None,
        take_profit: Optional[Decimal] = None,
    ) -> Decimal:
        """
        Open a new position.

        Returns the margin required.
        """
        if self.is_open:
            raise ValueError(
                "Position already open. Close or modify existing position."
            )

        self.side = side
        self.qty = qty
        self.entry_price = price
        self.current_price = price
        self.leverage = leverage
        self.opened_at = datetime.utcnow()
        self.stop_loss_price = stop_loss
        self.take_profit_price = take_profit
        self.margin_call_warning = False

        self._calculate_liquidation_price()
        self._calculate_pnl()

        return self.margin_used

    def increase_position(self, qty: Decimal, price: Decimal) -> Decimal:
        """
        Increase position size (add to existing position).

        Returns additional margin required.
        """
        if not self.is_open:
            raise ValueError("No open position to increase")

        total_value = (self.qty * self.entry_price) + (qty * price)
        new_qty = self.qty + qty
        self.entry_price = total_value / new_qty
        self.qty = new_qty

        self._calculate_liquidation_price()
        self._calculate_pnl()

        return (qty * price) / Decimal(self.leverage)

    def reduce_position(self, qty: Decimal, price: Decimal) -> Decimal:
        """
        Reduce position size (partial close).

        Returns realized PnL for the closed portion.
        """
        if not self.is_open:
            raise ValueError("No open position to reduce")

        if qty > self.qty:
            qty = self.qty

        price_diff = price - self.entry_price
        if self.is_short:
            price_diff = -price_diff

        portion_pnl = price_diff * qty
        self.qty -= qty
        self.realized_pnl += portion_pnl

        if self.qty <= 0:
            return self.close_position(price)

        self._calculate_pnl()
        return portion_pnl

    def close_position(self, close_price: Decimal) -> Decimal:
        """
        Close the entire position.

        Returns total realized PnL.
        """
        if not self.is_open:
            return Decimal("0")

        price_diff = close_price - self.entry_price
        if self.is_short:
            price_diff = -price_diff

        final_pnl = price_diff * self.qty
        self.realized_pnl += final_pnl

        # Reset position
        self.qty = Decimal("0")
        self.side = PositionSide.FLAT
        self.entry_price = Decimal("0")
        self.unrealized_pnl = Decimal("0")
        self.liquidation_price = None
        self.stop_loss_price = None
        self.take_profit_price = None
        self.margin_call_warning = False

        return final_pnl

    def _calculate_liquidation_price(
        self,
        maintenance_margin_rate: Decimal = MAINTENANCE_MARGIN_RATE,
    ) -> None:
        """
        Calculate liquidation price using Bybit-style formula.

        For LONG:  Liq Price = Entry * (1 - 1/leverage + maintenance_rate)
        For SHORT: Liq Price = Entry * (1 + 1/leverage - maintenance_rate)
        """
        if not self.is_open:
            self.liquidation_price = None
            return

        initial_margin_rate = Decimal("1") / Decimal(self.leverage)

        if self.is_long:
            self.liquidation_price = self.entry_price * (
                1 - initial_margin_rate + maintenance_margin_rate
            )
        else:
            self.liquidation_price = self.entry_price * (
                1 + initial_margin_rate - maintenance_margin_rate
            )

    def check_liquidation(self) -> bool:
        """Check if position should be liquidated at current price."""
        if not self.is_open or not self.liquidation_price:
            return False

        if self.is_long:
            return self.current_price <= self.liquidation_price
        else:
            return self.current_price >= self.liquidation_price

    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "portfolio_id": str(self.portfolio_id) if self.portfolio_id else None,
            "symbol": self.symbol,
            "side": self.side.value,
            "qty": str(self.qty),
            "entry_price": str(self.entry_price),
            "current_price": str(self.current_price),
            "unrealized_pnl": str(self.unrealized_pnl),
            "realized_pnl": str(self.realized_pnl),
            "leverage": self.leverage,
            "liquidation_price": (
                str(self.liquidation_price) if self.liquidation_price else None
            ),
            "stop_loss_price": (
                str(self.stop_loss_price) if self.stop_loss_price else None
            ),
            "take_profit_price": (
                str(self.take_profit_price) if self.take_profit_price else None
            ),
            "margin_used": str(self.margin_used),
            "maintenance_margin": str(self.maintenance_margin),
            "margin_call_warning": self.margin_call_warning,
            "roi_percent": str(self.roi_percent),
            "is_open": self.is_open,
        }
