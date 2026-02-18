"""Clan (team/guild) database models"""

import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ClanRole(str, Enum):
    LEADER = "LEADER"
    OFFICER = "OFFICER"
    MEMBER = "MEMBER"


class Clan(Base):
    """Clan model - a group of traders competing together."""
    __tablename__ = "clans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    tag: Mapped[str] = mapped_column(String(6), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    leader_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    max_members: Mapped[int] = mapped_column(Integer, default=20)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    members: Mapped[List["ClanMember"]] = relationship(
        "ClanMember", back_populates="clan", lazy="selectin"
    )
    leader = relationship("User", backref="led_clans")

    def __repr__(self) -> str:
        return f"<Clan [{self.tag}] {self.name}>"


class ClanMember(Base):
    """Clan membership model."""
    __tablename__ = "clan_members"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    clan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clans.id"), index=True, nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False
    )
    role: Mapped[ClanRole] = mapped_column(
        SQLEnum(ClanRole), default=ClanRole.MEMBER
    )

    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    clan: Mapped["Clan"] = relationship("Clan", back_populates="members")
    user = relationship("User", backref="clan_memberships")

    def __repr__(self) -> str:
        return f"<ClanMember user={self.user_id} clan={self.clan_id} role={self.role.value}>"
