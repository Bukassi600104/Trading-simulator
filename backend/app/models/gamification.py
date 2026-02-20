"""Gamification models: Streaks, Achievements, XP Ledger"""

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from .user import User


class Streak(Base):
    """Tracks a user's daily activity streak"""
    __tablename__ = "streaks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )
    current_streak: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    longest_streak: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    last_activity_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", backref="streak")

    def __repr__(self) -> str:
        return f"<Streak user={self.user_id} current={self.current_streak}>"


class Achievement(Base):
    """Unlocked achievements for a user"""
    __tablename__ = "achievements"

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
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    unlocked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    xp_awarded: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", backref="achievements")

    def __repr__(self) -> str:
        return f"<Achievement user={self.user_id} type={self.type}>"


class XPLedger(Base):
    """Ledger of all XP transactions for a user"""
    __tablename__ = "xp_ledger"

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
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", backref="xp_entries")

    def __repr__(self) -> str:
        return f"<XPLedger user={self.user_id} amount={self.amount}>"
