"""Order database model"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import OrderSide, OrderStatus, OrderType
from app.core.database import Base

if TYPE_CHECKING:
    from .portfolio import Portfolio


class Order(Base):
    """Order model for tracking all trading orders"""
    __tablename__ = "orders"

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
    
    # Order details
    symbol: Mapped[str] = mapped_column(String(20), index=True)  # e.g., "BTC-USDT"
    side: Mapped[OrderSide] = mapped_column(SQLEnum(OrderSide))
    order_type: Mapped[OrderType] = mapped_column(SQLEnum(OrderType))
    
    # Quantities and prices
    qty: Mapped[Decimal] = mapped_column(Numeric(precision=18, scale=8))
    price: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(precision=18, scale=8),
        nullable=True  # Null for market orders
    )
    filled_qty: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=8),
        default=Decimal("0")
    )
    avg_fill_price: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(precision=18, scale=8),
        nullable=True
    )
    
    # Status
    status: Mapped[OrderStatus] = mapped_column(
        SQLEnum(OrderStatus),
        default=OrderStatus.OPEN
    )
    
    # Reduce only flag (for closing positions)
    reduce_only: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    filled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    canceled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Relationships
    portfolio: Mapped["Portfolio"] = relationship("Portfolio", back_populates="orders")

    @property
    def value(self) -> Decimal:
        """Order value in quote currency"""
        price = self.avg_fill_price or self.price or Decimal("0")
        return self.qty * price

    @property
    def is_filled(self) -> bool:
        return self.status == OrderStatus.FILLED

    @property
    def is_open(self) -> bool:
        return self.status == OrderStatus.OPEN

    def __repr__(self) -> str:
        return f"<Order {self.side.value} {self.qty} {self.symbol} @ {self.price}>"
