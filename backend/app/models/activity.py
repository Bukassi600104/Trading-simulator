"""Activity feed database model"""

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from decimal import Decimal

from app.core.database import Base


class ActivityType(str, Enum):
    TRADE_WIN = "TRADE_WIN"
    TRADE_LOSS = "TRADE_LOSS"
    CHALLENGE_STARTED = "CHALLENGE_STARTED"
    CHALLENGE_PASSED = "CHALLENGE_PASSED"
    CHALLENGE_FAILED = "CHALLENGE_FAILED"
    COMPETITION_JOINED = "COMPETITION_JOINED"
    COMPETITION_WON = "COMPETITION_WON"
    CLAN_CREATED = "CLAN_CREATED"
    CLAN_JOINED = "CLAN_JOINED"
    MILESTONE = "MILESTONE"


class ActivityFeed(Base):
    """Activity feed entries for the community timeline."""
    __tablename__ = "activity_feed"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False
    )
    activity_type: Mapped[ActivityType] = mapped_column(
        SQLEnum(ActivityType), nullable=False
    )

    # Context data
    symbol: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    pnl: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(precision=18, scale=8), nullable=True
    )
    pnl_percent: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(precision=10, scale=4), nullable=True
    )
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Optional reference IDs
    challenge_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    competition_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    # Relationships
    user = relationship("User", backref="activities")

    def __repr__(self) -> str:
        return f"<Activity {self.activity_type.value} user={self.user_id}>"
