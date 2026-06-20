"""Scenario and ReplaySession models.

A *Scenario* is a reproducible market a teacher assigns to a cohort: either a
deterministic historical *replay* (a Parquet source range) or a Kronos-generated
*synthetic* market (from a seed context). A *ReplaySession* is one run of a
scenario for a cohort at a chosen speed.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import ReplaySessionState, ScenarioType
from app.core.database import Base


class Scenario(Base):
    """A reproducible practice market (replay range or synthetic seed)."""

    __tablename__ = "scenarios"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Nullable for global (platform-provided) scenarios.
    school_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("schools.id"), nullable=True, index=True
    )
    type: Mapped[str] = mapped_column(
        String(20), server_default=ScenarioType.REPLAY.value, nullable=False
    )
    symbol: Mapped[str] = mapped_column(String(20), index=True)
    timeframe: Mapped[str] = mapped_column(String(10))

    name: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    # For replay scenarios: {"start": iso, "end": iso}
    source_range: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # For synthetic scenarios: {"seed": int, "lookback_candles": [...], ...}
    seed_context: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # Training objective: {"max_drawdown_pct": float, "profit_target_pct": float}
    objective: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<Scenario {self.type} {self.symbol} {self.timeframe}>"


class ReplaySession(Base):
    """One run of a scenario for a cohort, streamed at a chosen speed."""

    __tablename__ = "replay_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    cohort_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cohorts.id"), index=True
    )
    scenario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("scenarios.id"), index=True
    )
    state: Mapped[str] = mapped_column(
        String(20), server_default=ReplaySessionState.SCHEDULED.value, nullable=False
    )
    # Replay speed multiplier (e.g. 1.0 realtime, 60.0 = 1 min/sec).
    speed: Mapped[float] = mapped_column(Float, server_default="1.0", nullable=False)

    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<ReplaySession cohort={self.cohort_id} state={self.state}>"
