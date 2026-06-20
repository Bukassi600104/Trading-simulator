"""School and SchoolSubscription models.

A *School* is the paying customer in the teacher-led academy model: an
influencer or community leader who onboards students into cohorts. Billing
(Paystack) lives at the school level, never on the individual user.
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import DEFAULT_STARTING_BALANCE, SchoolTier, SubscriptionStatus
from app.core.database import Base

if TYPE_CHECKING:
    from .cohort import Cohort


class School(Base):
    """A school / academy owned by a teacher, with a public profile page."""

    __tablename__ = "schools"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), index=True
    )
    # Public page URL slug, e.g. /school/midnight-academy
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Branding: logo url, accent colour, banner, socials, etc.
    branding: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # Billing identity (Paystack) — lives on the school, not the user.
    paystack_ref: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    subscription: Mapped[Optional["SchoolSubscription"]] = relationship(
        "SchoolSubscription",
        back_populates="school",
        uselist=False,
        lazy="selectin",
    )
    cohorts: Mapped[List["Cohort"]] = relationship(
        "Cohort", back_populates="school", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<School {self.slug}>"


class SchoolSubscription(Base):
    """A school's active subscription: seats + a paper-capital pool.

    Paper money is *allocation capacity*, not a consumable students burn by
    losing. The pool is distributed across seats by the teacher.
    """

    __tablename__ = "school_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    school_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("schools.id"), unique=True, index=True
    )
    tier: Mapped[str] = mapped_column(
        String(20), server_default=SchoolTier.STARTER.value, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), server_default=SubscriptionStatus.TRIALING.value, nullable=False
    )

    seats_total: Mapped[int] = mapped_column(Integer, server_default="5", nullable=False)
    seats_used: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)

    # Paper-capital pool (no cash value) the teacher allocates to students.
    paper_pool_total: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), default=DEFAULT_STARTING_BALANCE
    )
    paper_pool_allocated: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), default=Decimal("0")
    )

    current_period_end: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    paystack_ref: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    school: Mapped["School"] = relationship("School", back_populates="subscription")

    @property
    def seats_available(self) -> int:
        return max(0, self.seats_total - self.seats_used)

    @property
    def paper_pool_available(self) -> Decimal:
        return self.paper_pool_total - self.paper_pool_allocated

    def __repr__(self) -> str:
        return f"<SchoolSubscription school={self.school_id} tier={self.tier}>"
