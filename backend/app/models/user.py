"""User database model"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.config import UserTier
from app.core.database import Base

# Onboarding stages
# 0 = Just Registered
# 1 = Segmentation Complete (chose experience level)
# 2 = Tutorial Complete

if TYPE_CHECKING:
    from .portfolio import Portfolio


class User(Base):
    """User model for trading simulator"""
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[Optional[str]] = mapped_column(
        String(50), unique=True, index=True, nullable=True
    )
    onboarding_stage: Mapped[int] = mapped_column(
        Integer, server_default="0", nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255))
    tier: Mapped[UserTier] = mapped_column(
        SQLEnum(UserTier),
        default=UserTier.FREE
    )
    # clan_id is stored as nullable UUID without FK constraint for now
    clan_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True
    )
    referral_code: Mapped[Optional[str]] = mapped_column(
        String(6), unique=True, nullable=True
    )
    xp_total: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    trial_end_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
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
    portfolios: Mapped[List["Portfolio"]] = relationship(
        "Portfolio",
        back_populates="user",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<User {self.email}>"
