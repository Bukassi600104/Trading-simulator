"""Feature flag model for tier-based access control"""

import uuid

from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FeatureFlag(Base):
    """Feature flags controlling access by subscription tier"""
    __tablename__ = "feature_flags"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    feature_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    free_access: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    pro_access: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    elite_access: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)

    def __repr__(self) -> str:
        return f"<FeatureFlag {self.feature_name}>"
