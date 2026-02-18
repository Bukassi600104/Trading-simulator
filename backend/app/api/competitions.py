"""
Competition API Routes

Endpoints:
- POST /api/competitions              - Admin: create competition
- GET  /api/competitions              - List active/upcoming competitions
- GET  /api/competitions/{id}         - Competition details
- POST /api/competitions/{id}/join    - Join a competition
- GET  /api/competitions/{id}/leaderboard - Competition leaderboard
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import DEFAULT_LEVERAGE
from app.core.database import get_session
from app.core.security import TokenData, require_auth
from app.models.activity import ActivityFeed, ActivityType
from app.models.competition import Competition, CompetitionEntry, CompetitionStatus
from app.models.portfolio import Portfolio
from app.models.user import User

router = APIRouter(prefix="/api/competitions", tags=["competitions"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CreateCompetitionRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    starting_balance: Decimal = Field(default=Decimal("10000"))
    max_participants: Optional[int] = Field(None, ge=2)
    entry_fee: Decimal = Field(default=Decimal("0"))
    prize_pool: Optional[str] = None
    starts_at: datetime
    ends_at: datetime


class CompetitionResponse(BaseModel):
    id: str
    title: str
    description: str | None
    status: str
    starting_balance: str
    max_participants: int | None
    entry_fee: str
    prize_pool: str | None
    participant_count: int
    starts_at: str
    ends_at: str
    created_at: str


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    email: str
    pnl: str
    pnl_percent: str
    total_trades: int


class CompetitionDetailResponse(CompetitionResponse):
    leaderboard: List[LeaderboardEntry] = []


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_admin_user(
    token_data: TokenData, db: AsyncSession
) -> User:
    """Ensure caller is a superuser."""
    uid = uuid.UUID(token_data.user_id)
    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


def _comp_response(comp: Competition, participant_count: int) -> CompetitionResponse:
    return CompetitionResponse(
        id=str(comp.id),
        title=comp.title,
        description=comp.description,
        status=comp.status.value,
        starting_balance=str(comp.starting_balance),
        max_participants=comp.max_participants,
        entry_fee=str(comp.entry_fee),
        prize_pool=comp.prize_pool,
        participant_count=participant_count,
        starts_at=comp.starts_at.isoformat(),
        ends_at=comp.ends_at.isoformat(),
        created_at=comp.created_at.isoformat(),
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=CompetitionResponse, status_code=status.HTTP_201_CREATED)
async def create_competition(
    request: CreateCompetitionRequest,
    token_data: TokenData = Depends(require_auth),
    db: AsyncSession = Depends(get_session),
) -> CompetitionResponse:
    """Create a new trading competition (admin only)."""
    admin = await _get_admin_user(token_data, db)

    if request.ends_at <= request.starts_at:
        raise HTTPException(
            status_code=400, detail="ends_at must be after starts_at"
        )

    now = datetime.now(timezone.utc)
    comp_status = (
        CompetitionStatus.ACTIVE
        if request.starts_at <= now
        else CompetitionStatus.UPCOMING
    )

    comp = Competition(
        title=request.title,
        description=request.description,
        status=comp_status,
        starting_balance=request.starting_balance,
        max_participants=request.max_participants,
        entry_fee=request.entry_fee,
        prize_pool=request.prize_pool,
        starts_at=request.starts_at,
        ends_at=request.ends_at,
        created_by=admin.id,
    )
    db.add(comp)
    await db.commit()
    await db.refresh(comp)

    return _comp_response(comp, 0)


@router.get("", response_model=List[CompetitionResponse])
async def list_competitions(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_session),
) -> List[CompetitionResponse]:
    """List competitions. Defaults to UPCOMING + ACTIVE."""
    stmt = select(Competition).order_by(desc(Competition.starts_at)).limit(limit)

    if status_filter:
        try:
            s = CompetitionStatus(status_filter.upper())
            stmt = stmt.where(Competition.status == s)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {[s.value for s in CompetitionStatus]}",
            )
    else:
        stmt = stmt.where(
            Competition.status.in_([CompetitionStatus.UPCOMING, CompetitionStatus.ACTIVE])
        )

    result = await db.execute(stmt)
    comps = result.scalars().all()

    responses = []
    for comp in comps:
        count_result = await db.execute(
            select(func.count(CompetitionEntry.id)).where(
                CompetitionEntry.competition_id == comp.id
            )
        )
        count = count_result.scalar() or 0
        responses.append(_comp_response(comp, count))

    return responses


@router.get("/{competition_id}", response_model=CompetitionDetailResponse)
async def get_competition(
    competition_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
) -> CompetitionDetailResponse:
    """Get competition details with leaderboard."""
    result = await db.execute(
        select(Competition).where(Competition.id == competition_id)
    )
    comp = result.scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Competition not found")

    # Build leaderboard
    entries_result = await db.execute(
        select(CompetitionEntry, User.email)
        .join(User, CompetitionEntry.user_id == User.id)
        .where(CompetitionEntry.competition_id == competition_id)
        .order_by(desc(CompetitionEntry.pnl_percent))
    )
    rows = entries_result.all()

    leaderboard = []
    for i, (entry, email) in enumerate(rows, 1):
        leaderboard.append(
            LeaderboardEntry(
                rank=i,
                user_id=str(entry.user_id),
                email=email,
                pnl=str(entry.pnl),
                pnl_percent=str(entry.pnl_percent),
                total_trades=entry.total_trades,
            )
        )

    count = len(rows)
    base = _comp_response(comp, count)

    return CompetitionDetailResponse(
        **base.model_dump(),
        leaderboard=leaderboard,
    )


@router.post("/{competition_id}/join")
async def join_competition(
    competition_id: uuid.UUID,
    token_data: TokenData = Depends(require_auth),
    db: AsyncSession = Depends(get_session),
):
    """Join a competition. Creates a dedicated portfolio for the user."""
    uid = uuid.UUID(token_data.user_id)

    result = await db.execute(
        select(Competition).where(Competition.id == competition_id)
    )
    comp = result.scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Competition not found")

    if comp.status not in (CompetitionStatus.UPCOMING, CompetitionStatus.ACTIVE):
        raise HTTPException(
            status_code=400, detail="Competition is not open for joining"
        )

    # Check max participants
    if comp.max_participants:
        count_result = await db.execute(
            select(func.count(CompetitionEntry.id)).where(
                CompetitionEntry.competition_id == comp.id
            )
        )
        count = count_result.scalar() or 0
        if count >= comp.max_participants:
            raise HTTPException(
                status_code=400, detail="Competition is full"
            )

    # Check if already joined
    existing = await db.execute(
        select(CompetitionEntry).where(
            CompetitionEntry.competition_id == competition_id,
            CompetitionEntry.user_id == uid,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already joined this competition",
        )

    # Create dedicated portfolio
    portfolio = Portfolio(
        id=uuid.uuid4(),
        user_id=uid,
        balance=comp.starting_balance,
        starting_balance=comp.starting_balance,
        leverage=DEFAULT_LEVERAGE,
        max_drawdown_watermark=comp.starting_balance,
        is_active=True,
    )
    db.add(portfolio)
    await db.flush()

    entry = CompetitionEntry(
        competition_id=competition_id,
        user_id=uid,
        portfolio_id=portfolio.id,
        starting_balance=comp.starting_balance,
        current_balance=comp.starting_balance,
    )
    db.add(entry)

    # Activity feed
    db.add(ActivityFeed(
        user_id=uid,
        activity_type=ActivityType.COMPETITION_JOINED,
        message=f"Joined competition: {comp.title}",
        competition_id=competition_id,
    ))

    await db.commit()

    return {
        "success": True,
        "message": f"Joined competition: {comp.title}",
        "portfolio_id": str(portfolio.id),
    }


@router.get("/{competition_id}/leaderboard", response_model=List[LeaderboardEntry])
async def get_competition_leaderboard(
    competition_id: uuid.UUID,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_session),
) -> List[LeaderboardEntry]:
    """Get competition leaderboard ranked by PnL percentage."""
    result = await db.execute(
        select(Competition).where(Competition.id == competition_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Competition not found")

    entries_result = await db.execute(
        select(CompetitionEntry, User.email)
        .join(User, CompetitionEntry.user_id == User.id)
        .where(CompetitionEntry.competition_id == competition_id)
        .order_by(desc(CompetitionEntry.pnl_percent))
        .limit(limit)
    )

    rows = entries_result.all()
    return [
        LeaderboardEntry(
            rank=i,
            user_id=str(entry.user_id),
            email=email,
            pnl=str(entry.pnl),
            pnl_percent=str(entry.pnl_percent),
            total_trades=entry.total_trades,
        )
        for i, (entry, email) in enumerate(rows, 1)
    ]
