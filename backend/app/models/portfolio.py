"""Portfolio database model - The user's simulated wallet"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import DEFAULT_LEVERAGE, DEFAULT_STARTING_BALANCE
from app.core.database import Base

if TYPE_CHECKING:
    from .order import Order
    from .position import Position
    from .user import User


class Portfolio(Base):
    """Portfolio model - represents a user's simulated trading account"""
    __tablename__ = "portfolios"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        index=True
    )
    
    # Balance tracking
    balance: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=8),
        default=DEFAULT_STARTING_BALANCE
    )
    starting_balance: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=8),
        default=DEFAULT_STARTING_BALANCE
    )
    
    # Leverage settings
    leverage: Mapped[int] = mapped_column(Integer, default=DEFAULT_LEVERAGE)
    
    # For Prop Mode - tracks highest equity for max drawdown calculation
    max_drawdown_watermark: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=8),
        default=DEFAULT_STARTING_BALANCE
    )
    
    # Account status
    is_liquidated: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="portfolios")
    orders: Mapped[List["Order"]] = relationship(
        "Order",
        back_populates="portfolio",
        lazy="selectin"
    )
    positions: Mapped[List["Position"]] = relationship(
        "Position",
        back_populates="portfolio",
        lazy="selectin"
    )

    @property
    def equity(self) -> Decimal:
        """Calculate equity = balance + unrealized PnL from all positions"""
        unrealized_pnl = sum(p.unrealized_pnl for p in self.positions if p.is_open)
        return self.balance + unrealized_pnl

    def __repr__(self) -> str:
        return f"<Portfolio user={self.user_id} balance={self.balance}>"
