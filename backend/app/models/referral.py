"""Referral and referral credit models"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from .user import User


class Referral(Base):
    """Tracks referral relationships between users"""
    __tablename__ = "referrals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    referrer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    referred_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )
    referral_code: Mapped[str] = mapped_column(String(6), nullable=False)
    reward_granted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Relationships
    referrer: Mapped["User"] = relationship(
        "User", foreign_keys=[referrer_id], backref="referrals_made"
    )
    referred_user: Mapped["User"] = relationship(
        "User", foreign_keys=[referred_user_id], backref="referred_by"
    )

    def __repr__(self) -> str:
        return f"<Referral referrer={self.referrer_id} referred={self.referred_user_id}>"


class ReferralCredit(Base):
    """Credits granted to users through referrals"""
    __tablename__ = "referral_credits"

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
    days_credited: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", backref="referral_credits")

    def __repr__(self) -> str:
        return f"<ReferralCredit user={self.user_id} days={self.days_credited}>"
