"""
User Position - In-memory position state for real-time PnL updates

This is adapted from Jesse's Position model but designed for multi-user support.
Each UserPosition tracks a single symbol position for one user.
"""

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Optional

from app.core.config import PositionSide


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
        """Position value at current price"""
        return abs(self.qty) * self.current_price
    
    @property
    def margin_used(self) -> Decimal:
        """Initial margin for this position"""
        if self.entry_price and self.qty:
            return abs(self.qty) * self.entry_price / Decimal(self.leverage)
        return Decimal("0")
    
    @property
    def roi_percent(self) -> Decimal:
        """Return on investment percentage"""
        if self.margin_used > 0:
            return (self.unrealized_pnl / self.margin_used) * 100
        return Decimal("0")
    
    def update_price(self, new_price: Decimal) -> None:
        """Update current price and recalculate unrealized PnL"""
        self.current_price = new_price
        self._calculate_pnl()
    
    def _calculate_pnl(self) -> None:
        """Calculate unrealized PnL based on current price"""
        if not self.is_open or not self.entry_price:
            self.unrealized_pnl = Decimal("0")
            return
        
        price_diff = self.current_price - self.entry_price
        if self.is_short:
            price_diff = -price_diff
        
        self.unrealized_pnl = price_diff * abs(self.qty)
    
    def open_position(
        self,
        side: PositionSide,
        qty: Decimal,
        price: Decimal,
        leverage: int
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
        
        # Calculate liquidation price
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
        
        # Calculate new average entry price
        total_value = (self.qty * self.entry_price) + (qty * price)
        new_qty = self.qty + qty
        self.entry_price = total_value / new_qty
        self.qty = new_qty
        
        # Recalculate liquidation price with new entry
        self._calculate_liquidation_price()
        self._calculate_pnl()
        
        # Return additional margin required for the new qty
        return (qty * price) / Decimal(self.leverage)
    
    def reduce_position(self, qty: Decimal, price: Decimal) -> Decimal:
        """
        Reduce position size (partial close).
        
        Returns realized PnL for the closed portion.
        """
        if not self.is_open:
            raise ValueError("No open position to reduce")
        
        if qty > self.qty:
            qty = self.qty  # Can't close more than we have
        
        # Calculate PnL for closed portion
        price_diff = price - self.entry_price
        if self.is_short:
            price_diff = -price_diff
        
        portion_pnl = price_diff * qty
        
        # Update position
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
        
        # Calculate final PnL
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
        
        return final_pnl
    
    def _calculate_liquidation_price(
        self, maintenance_margin_rate: Decimal = Decimal("0.005")
    ) -> None:
        """
        Calculate liquidation price using Bybit-style formula.
        
        For LONG: Liq Price = Entry * (1 - 1/leverage + maintenance_rate)
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
        """Check if position should be liquidated at current price"""
        if not self.is_open or not self.liquidation_price:
            return False
        
        if self.is_long:
            return self.current_price <= self.liquidation_price
        else:
            return self.current_price >= self.liquidation_price
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses"""
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
            "margin_used": str(self.margin_used),
            "roi_percent": str(self.roi_percent),
            "is_open": self.is_open,
        }
