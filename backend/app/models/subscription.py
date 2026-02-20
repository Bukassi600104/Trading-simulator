"""Subscription plan and customer subscription models"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from .user import User


class SubscriptionPlan(Base):
    """Available subscription plans (Free, Pro, Elite)"""
    __tablename__ = "subscription_plans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    price_usd: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    price_ngn: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    features: Mapped[Optional[dict]] = mapped_column(JSONB(), nullable=True)
    stripe_price_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    stripe_annual_price_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    paystack_plan_code: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<SubscriptionPlan {self.name} ${self.price_usd}>"


class CustomerSubscription(Base):
    """A user's active subscription to a plan"""
    __tablename__ = "customer_subscriptions"

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
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subscription_plans.id"),
        nullable=False
    )
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    paystack_customer_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    paystack_subscription_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), server_default="active", nullable=False)
    trial_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    period_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    period_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
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
    user: Mapped["User"] = relationship("User", backref="subscriptions")
    plan: Mapped["SubscriptionPlan"] = relationship("SubscriptionPlan")

    def __repr__(self) -> str:
        return f"<CustomerSubscription user={self.user_id} status={self.status}>"
