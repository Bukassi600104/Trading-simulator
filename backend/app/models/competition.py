"""Competition database models"""

import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class CompetitionStatus(str, Enum):
    UPCOMING = "UPCOMING"
    ACTIVE = "ACTIVE"
    ENDED = "ENDED"
    CANCELLED = "CANCELLED"


class Competition(Base):
    """Trading competition model.

    Admins create competitions with a start/end time. Users join and trade
    during the window. The leaderboard ranks entrants by PnL percentage.
    """
    __tablename__ = "competitions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[CompetitionStatus] = mapped_column(
        SQLEnum(CompetitionStatus), default=CompetitionStatus.UPCOMING
    )

    # Competition parameters
    starting_balance: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=8), nullable=False
    )
    max_participants: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    entry_fee: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), default=Decimal("0")
    )
    prize_pool: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )

    # Timing
    starts_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    ends_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    # Admin
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    entries: Mapped[List["CompetitionEntry"]] = relationship(
        "CompetitionEntry", back_populates="competition", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Competition {self.title} status={self.status.value}>"


class CompetitionEntry(Base):
    """A user's entry (participation) in a competition."""
    __tablename__ = "competition_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    competition_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("competitions.id"), index=True, nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False
    )
    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("portfolios.id"), nullable=False
    )

    # Snapshot at join time
    starting_balance: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=8), nullable=False
    )
    current_balance: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=8), nullable=False
    )
    pnl: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=8), default=Decimal("0")
    )
    pnl_percent: Mapped[Decimal] = mapped_column(
        Numeric(precision=10, scale=4), default=Decimal("0")
    )
    rank: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    total_trades: Mapped[int] = mapped_column(Integer, default=0)

    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    competition: Mapped["Competition"] = relationship(
        "Competition", back_populates="entries"
    )
    user = relationship("User", backref="competition_entries")

    def __repr__(self) -> str:
        return f"<CompetitionEntry user={self.user_id} comp={self.competition_id}>"
