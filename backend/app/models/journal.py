"""Journal Entry database model"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from .portfolio import Portfolio

class JournalEntry(Base):
    """Journal Entry model - Snapshot of a completed trade"""
    __tablename__ = "journal_entries"

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
    
    symbol: Mapped[str] = mapped_column(String(20), index=True)
    side: Mapped[str] = mapped_column(String(10)) # LONG/SHORT
    
    entry_price: Mapped[Decimal] = mapped_column(Numeric(18, 8))
    exit_price: Mapped[Decimal] = mapped_column(Numeric(18, 8))
    qty: Mapped[Decimal] = mapped_column(Numeric(18, 8))
    
    pnl: Mapped[Decimal] = mapped_column(Numeric(18, 8))
    pnl_percent: Mapped[Decimal] = mapped_column(Numeric(10, 4))
    
    entry_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    exit_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    
    # User annotations
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[str]] = mapped_column(String(255), nullable=True) # Comma separated
    screenshot_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    
    # Emotions/Psychology
    emotion: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    mistake: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
