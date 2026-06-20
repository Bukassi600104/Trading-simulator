"""Student model — a user enrolled in a cohort with an assigned paper account.

Portfolios/Orders/Positions are scoped under a Student. Resetting a blown
paper account is a normal teaching action, never a paywall trigger.
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import DEFAULT_STARTING_BALANCE
from app.core.database import Base

if TYPE_CHECKING:
    from .cohort import Cohort


class Student(Base):
    """A student enrolment record linking a user to a cohort + school."""

    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), index=True
    )
    cohort_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cohorts.id"), nullable=True, index=True
    )
    school_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("schools.id"), index=True
    )

    # Paper account balance allocated from the school's pool (no cash value).
    paper_account_balance: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), default=DEFAULT_STARTING_BALANCE
    )
    # invited | active | suspended | removed
    status: Mapped[str] = mapped_column(
        String(20), server_default="invited", nullable=False
    )

    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    cohort: Mapped[Optional["Cohort"]] = relationship(
        "Cohort", back_populates="students"
    )

    def __repr__(self) -> str:
        return f"<Student user={self.user_id} cohort={self.cohort_id}>"
