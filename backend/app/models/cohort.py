"""Cohort model — a class of students taught by one instructor.

Leverage is teacher-configurable per cohort, with a sane default ceiling well
below the old 100x. Training Objectives (drawdown limits, profit targets) are
assigned to a cohort via Scenarios rather than as a prop-firm pass/fail gate.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import DEFAULT_COHORT_LEVERAGE_CAP
from app.core.database import Base

if TYPE_CHECKING:
    from .school import School
    from .student import Student


class Cohort(Base):
    """A cohort (class) within a school."""

    __tablename__ = "cohorts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    school_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("schools.id"), index=True
    )
    name: Mapped[str] = mapped_column(String(160))
    instructor_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    leverage_cap: Mapped[int] = mapped_column(
        Integer, server_default=str(DEFAULT_COHORT_LEVERAGE_CAP), nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    school: Mapped["School"] = relationship("School", back_populates="cohorts")
    students: Mapped[List["Student"]] = relationship(
        "Student", back_populates="cohort", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Cohort {self.name} school={self.school_id}>"
