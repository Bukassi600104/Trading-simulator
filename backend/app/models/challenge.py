"""Challenge database model for prop trading challenges"""

import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ChallengePhase(str, Enum):
    PHASE_1 = "PHASE_1"
    PHASE_2 = "PHASE_2"
    FUNDED = "FUNDED"


class ChallengeStatus(str, Enum):
    ACTIVE = "ACTIVE"
    PASSED = "PASSED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class Challenge(Base):
    """Prop trading challenge model.

    Tracks a user's progress through a simulated prop firm evaluation:
    - Phase 1: 10% profit target, 5% daily drawdown limit, 10% total drawdown limit
    - Phase 2: 5% profit target, same drawdown limits
    - Funded: No profit target, same drawdown limits, profit sharing
    """
    __tablename__ = "challenges"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False
    )
    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("portfolios.id"), nullable=False
    )

    # Challenge configuration
    phase: Mapped[ChallengePhase] = mapped_column(
        SQLEnum(ChallengePhase), default=ChallengePhase.PHASE_1
    )
    status: Mapped[ChallengeStatus] = mapped_column(
        SQLEnum(ChallengeStatus), default=ChallengeStatus.ACTIVE
    )
    starting_balance: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=8), nullable=False
    )

    # Targets and limits (stored as absolute values for the current phase)
    profit_target: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=8), nullable=False
    )
    daily_drawdown_limit: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=8), nullable=False
    )
    total_drawdown_limit: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=8), nullable=False
    )

    # Tracking metrics
    current_balance: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=8), nullable=False
    )
    highest_balance: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=8), nullable=False
    )
    daily_start_balance: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=8), nullable=False
    )
    total_trades: Mapped[int] = mapped_column(Integer, default=0)
    winning_trades: Mapped[int] = mapped_column(Integer, default=0)
    losing_trades: Mapped[int] = mapped_column(Integer, default=0)
    total_pnl: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=8), default=Decimal("0")
    )

    # Failure reason (if failed)
    fail_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    daily_reset_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user = relationship("User", backref="challenges")

    def __repr__(self) -> str:
        return f"<Challenge {self.id} user={self.user_id} phase={self.phase.value} status={self.status.value}>"
