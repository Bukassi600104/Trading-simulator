"""Leaderboard snapshot model"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from .user import User


class LeaderboardSnapshot(Base):
    """Periodic leaderboard snapshots for ranking users"""
    __tablename__ = "leaderboard_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    period: Mapped[str] = mapped_column(String(20), nullable=False)
    metric_type: Mapped[str] = mapped_column(String(50), nullable=False)
    metric_value: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", backref="leaderboard_snapshots")

    def __repr__(self) -> str:
        return f"<LeaderboardSnapshot user={self.user_id} rank={self.rank}>"
