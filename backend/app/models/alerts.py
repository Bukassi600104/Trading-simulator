"""Price alerts and notification preferences models"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from .user import User


class PriceAlert(Base):
    """User-configured price alerts for crypto assets"""
    __tablename__ = "price_alerts"

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
    asset: Mapped[str] = mapped_column(String(20), nullable=False)
    threshold_price: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    direction: Mapped[str] = mapped_column(String(10), nullable=False)
    triggered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", backref="price_alerts")

    def __repr__(self) -> str:
        return f"<PriceAlert user={self.user_id} asset={self.asset} {self.direction} {self.threshold_price}>"


class NotificationPreferences(Base):
    """Per-user notification preferences"""
    __tablename__ = "notification_preferences"

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
    streak_reminders: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    price_alerts_enabled: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    challenge_updates: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    marketing_emails: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", backref="notification_preferences")

    def __repr__(self) -> str:
        return f"<NotificationPreferences user={self.user_id}>"
