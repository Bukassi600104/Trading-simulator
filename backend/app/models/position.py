"""Position database model - tracks open positions"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import PositionSide
from app.core.database import Base

if TYPE_CHECKING:
    from .portfolio import Portfolio


class Position(Base):
    """Position model for tracking open trading positions"""
    __tablename__ = "positions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("portfolios.id"),
        index=True
    )
    
    # Position details
    symbol: Mapped[str] = mapped_column(String(20), index=True)
    side: Mapped[PositionSide] = mapped_column(
        SQLEnum(PositionSide),
        default=PositionSide.FLAT
    )
    
    # Position size and entry
    qty: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=8),
        default=Decimal("0")
    )
    entry_price: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(precision=18, scale=8),
        nullable=True
    )
    
    # Current market state (updated on each tick)
    current_price: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(precision=18, scale=8),
        nullable=True
    )
    
    # Calculated fields (stored for quick access)
    unrealized_pnl: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=8),
        default=Decimal("0")
    )
    realized_pnl: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=8),
        default=Decimal("0")
    )
    
    # Liquidation tracking
    liquidation_price: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(precision=18, scale=8),
        nullable=True
    )
    
    # Leverage for this position
    leverage: Mapped[int] = mapped_column(default=10)
    
    # Status
    is_open: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Timestamps
    opened_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    closed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    # Relationships
    portfolio: Mapped["Portfolio"] = relationship(
        "Portfolio", back_populates="positions"
    )

    @property
    def value(self) -> Decimal:
        """Position value at current price"""
        if self.current_price and self.qty:
            return abs(self.qty) * self.current_price
        return Decimal("0")

    @property
    def margin_used(self) -> Decimal:
        """Margin required for this position"""
        if self.entry_price and self.qty:
            return abs(self.qty) * self.entry_price / Decimal(self.leverage)
        return Decimal("0")

    @property
    def roi_percent(self) -> Decimal:
        """Return on investment as percentage"""
        if self.margin_used and self.margin_used > 0:
            return (self.unrealized_pnl / self.margin_used) * 100
        return Decimal("0")

    def calculate_pnl(self, current_price: Decimal) -> Decimal:
        """Calculate unrealized PnL at given price"""
        if not self.is_open or not self.entry_price or not self.qty:
            return Decimal("0")
        
        price_diff = current_price - self.entry_price
        if self.side == PositionSide.SHORT:
            price_diff = -price_diff
        
        return price_diff * abs(self.qty)

    def calculate_liquidation_price(
        self, maintenance_margin_rate: Decimal = Decimal("0.005")
    ) -> Optional[Decimal]:
        """
        Calculate liquidation price based on Bybit-style formula.
        
        For LONG:
            Liq = Entry * (1 - InitialMarginRate + MaintenanceMarginRate)
        For SHORT:
            Liq = Entry * (1 + InitialMarginRate - MaintenanceMarginRate)
        """
        if not self.entry_price or self.side == PositionSide.FLAT:
            return None
        
        initial_margin_rate = Decimal("1") / Decimal(self.leverage)
        
        if self.side == PositionSide.LONG:
            liq = self.entry_price * (
                1 - initial_margin_rate + maintenance_margin_rate
            )
        else:  # SHORT
            liq = self.entry_price * (
                1 + initial_margin_rate - maintenance_margin_rate
            )
        return liq

    def __repr__(self) -> str:
        return (
            f"<Position {self.side.value} {self.qty} "
            f"{self.symbol} @ {self.entry_price}>"
        )
