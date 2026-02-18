"""
Challenge API Routes (Prop Trading Challenges)

Endpoints:
- POST /api/challenges          - Start a new challenge
- GET  /api/challenges          - List user's challenges
- GET  /api/challenges/{id}     - Get challenge details with metrics
- POST /api/challenges/{id}/check - Manually trigger rule-check (called after each trade)
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import DEFAULT_LEVERAGE, DEFAULT_STARTING_BALANCE
from app.core.database import get_session
from app.core.security import TokenData, require_auth
from app.models.challenge import Challenge, ChallengePhase, ChallengeStatus
from app.models.activity import ActivityFeed, ActivityType
from app.models.portfolio import Portfolio
from app.models.user import User, UserTier
from jesse_custom.engine import get_portfolio_manager

router = APIRouter(prefix="/api/challenges", tags=["challenges"])


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CHALLENGE_BALANCE = Decimal("100000")  # $100k simulated account

PHASE_CONFIG = {
    ChallengePhase.PHASE_1: {
        "profit_target_pct": Decimal("0.10"),       # 10%
        "daily_drawdown_pct": Decimal("0.05"),       # 5%
        "total_drawdown_pct": Decimal("0.10"),       # 10%
    },
    ChallengePhase.PHASE_2: {
        "profit_target_pct": Decimal("0.05"),        # 5%
        "daily_drawdown_pct": Decimal("0.05"),       # 5%
        "total_drawdown_pct": Decimal("0.10"),       # 10%
    },
    ChallengePhase.FUNDED: {
        "profit_target_pct": None,                   # no target
        "daily_drawdown_pct": Decimal("0.05"),       # 5%
        "total_drawdown_pct": Decimal("0.10"),       # 10%
    },
}


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class StartChallengeRequest(BaseModel):
    starting_balance: Optional[Decimal] = Field(
        None, description="Override starting balance (default $100k)"
    )


class ChallengeMetrics(BaseModel):
    profit_pct: float
    profit_target_pct: float | None
    daily_drawdown_pct: float
    daily_drawdown_limit_pct: float
    total_drawdown_pct: float
    total_drawdown_limit_pct: float
    total_trades: int
    win_rate: float
    is_profit_target_met: bool
    is_daily_dd_breached: bool
    is_total_dd_breached: bool


class ChallengeResponse(BaseModel):
    id: str
    user_id: str
    portfolio_id: str
    phase: str
    status: str
    starting_balance: str
    current_balance: str
    highest_balance: str
    total_pnl: str
    total_trades: int
    winning_trades: int
    losing_trades: int
    fail_reason: str | None
    started_at: str
    ended_at: str | None
    metrics: ChallengeMetrics | None = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _compute_metrics(ch: Challenge) -> ChallengeMetrics:
    """Compute real-time challenge metrics."""
    cfg = PHASE_CONFIG[ch.phase]

    profit_pct = (
        float((ch.current_balance - ch.starting_balance) / ch.starting_balance * 100)
        if ch.starting_balance > 0 else 0.0
    )
    profit_target_pct = float(cfg["profit_target_pct"] * 100) if cfg["profit_target_pct"] else None

    # Daily drawdown: how much we've dropped from today's opening balance
    daily_dd = (
        float((ch.daily_start_balance - ch.current_balance) / ch.daily_start_balance * 100)
        if ch.daily_start_balance > 0 else 0.0
    )
    daily_dd = max(daily_dd, 0.0)

    # Total drawdown: how much we've dropped from the highest balance
    total_dd = (
        float((ch.highest_balance - ch.current_balance) / ch.highest_balance * 100)
        if ch.highest_balance > 0 else 0.0
    )
    total_dd = max(total_dd, 0.0)

    daily_limit = float(cfg["daily_drawdown_pct"] * 100)
    total_limit = float(cfg["total_drawdown_pct"] * 100)

    win_rate = (
        ch.winning_trades / ch.total_trades * 100 if ch.total_trades > 0 else 0.0
    )

    return ChallengeMetrics(
        profit_pct=round(profit_pct, 2),
        profit_target_pct=profit_target_pct,
        daily_drawdown_pct=round(daily_dd, 2),
        daily_drawdown_limit_pct=daily_limit,
        total_drawdown_pct=round(total_dd, 2),
        total_drawdown_limit_pct=total_limit,
        total_trades=ch.total_trades,
        win_rate=round(win_rate, 2),
        is_profit_target_met=(
            profit_pct >= profit_target_pct if profit_target_pct else False
        ),
        is_daily_dd_breached=daily_dd >= daily_limit,
        is_total_dd_breached=total_dd >= total_limit,
    )


def _challenge_response(ch: Challenge, include_metrics: bool = True) -> ChallengeResponse:
    return ChallengeResponse(
        id=str(ch.id),
        user_id=str(ch.user_id),
        portfolio_id=str(ch.portfolio_id),
        phase=ch.phase.value,
        status=ch.status.value,
        starting_balance=str(ch.starting_balance),
        current_balance=str(ch.current_balance),
        highest_balance=str(ch.highest_balance),
        total_pnl=str(ch.total_pnl),
        total_trades=ch.total_trades,
        winning_trades=ch.winning_trades,
        losing_trades=ch.losing_trades,
        fail_reason=ch.fail_reason,
        started_at=ch.started_at.isoformat() if ch.started_at else "",
        ended_at=ch.ended_at.isoformat() if ch.ended_at else None,
        metrics=_compute_metrics(ch) if include_metrics else None,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=ChallengeResponse, status_code=status.HTTP_201_CREATED)
async def start_challenge(
    request: StartChallengeRequest = StartChallengeRequest(),
    token_data: TokenData = Depends(require_auth),
    db: AsyncSession = Depends(get_session),
) -> ChallengeResponse:
    """Start a new prop trading challenge.

    Creates a dedicated portfolio for the challenge with challenge-specific
    balance and rules.
    """
    uid = uuid.UUID(token_data.user_id)

    # Check user tier -- require PRO or PROP_CHALLENGE
    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.tier == UserTier.FREE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Upgrade to PRO or PROP_CHALLENGE tier to start a challenge",
        )

    # Check no active challenge exists
    active = await db.execute(
        select(Challenge).where(
            Challenge.user_id == uid,
            Challenge.status == ChallengeStatus.ACTIVE,
        )
    )
    if active.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an active challenge. Complete or cancel it first.",
        )

    balance = request.starting_balance or CHALLENGE_BALANCE
    cfg = PHASE_CONFIG[ChallengePhase.PHASE_1]

    # Create a dedicated challenge portfolio
    portfolio = Portfolio(
        id=uuid.uuid4(),
        user_id=uid,
        balance=balance,
        starting_balance=balance,
        leverage=DEFAULT_LEVERAGE,
        max_drawdown_watermark=balance,
        is_active=True,
    )
    db.add(portfolio)
    await db.flush()

    challenge = Challenge(
        user_id=uid,
        portfolio_id=portfolio.id,
        phase=ChallengePhase.PHASE_1,
        status=ChallengeStatus.ACTIVE,
        starting_balance=balance,
        profit_target=balance * (1 + cfg["profit_target_pct"]),
        daily_drawdown_limit=balance * cfg["daily_drawdown_pct"],
        total_drawdown_limit=balance * cfg["total_drawdown_pct"],
        current_balance=balance,
        highest_balance=balance,
        daily_start_balance=balance,
    )
    db.add(challenge)

    # Activity feed
    activity = ActivityFeed(
        user_id=uid,
        activity_type=ActivityType.CHALLENGE_STARTED,
        message=f"Started Phase 1 challenge with ${balance:,.0f} balance",
        challenge_id=challenge.id,
    )
    db.add(activity)

    await db.commit()
    await db.refresh(challenge)

    return _challenge_response(challenge)


@router.get("", response_model=List[ChallengeResponse])
async def list_challenges(
    token_data: TokenData = Depends(require_auth),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_session),
) -> List[ChallengeResponse]:
    """List the authenticated user's challenges."""
    uid = uuid.UUID(token_data.user_id)

    stmt = (
        select(Challenge)
        .where(Challenge.user_id == uid)
        .order_by(desc(Challenge.created_at))
        .limit(limit)
    )

    if status_filter:
        try:
            s = ChallengeStatus(status_filter.upper())
            stmt = stmt.where(Challenge.status == s)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {[s.value for s in ChallengeStatus]}",
            )

    result = await db.execute(stmt)
    challenges = result.scalars().all()
    return [_challenge_response(ch) for ch in challenges]


@router.get("/{challenge_id}", response_model=ChallengeResponse)
async def get_challenge(
    challenge_id: uuid.UUID,
    token_data: TokenData = Depends(require_auth),
    db: AsyncSession = Depends(get_session),
) -> ChallengeResponse:
    """Get detailed challenge info with live metrics."""
    uid = uuid.UUID(token_data.user_id)

    result = await db.execute(
        select(Challenge).where(
            Challenge.id == challenge_id,
            Challenge.user_id == uid,
        )
    )
    ch = result.scalar_one_or_none()
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")

    return _challenge_response(ch)


@router.post("/{challenge_id}/check", response_model=ChallengeResponse)
async def check_challenge_rules(
    challenge_id: uuid.UUID,
    token_data: TokenData = Depends(require_auth),
    db: AsyncSession = Depends(get_session),
) -> ChallengeResponse:
    """Run rule evaluation on an active challenge.

    Call this after each trade to check:
    - Daily drawdown breach (-5%)
    - Total drawdown breach (-10%)
    - Profit target hit (10% Phase 1, 5% Phase 2)

    Auto-fails or auto-passes the challenge as appropriate.
    """
    uid = uuid.UUID(token_data.user_id)

    result = await db.execute(
        select(Challenge).where(
            Challenge.id == challenge_id,
            Challenge.user_id == uid,
        )
    )
    ch = result.scalar_one_or_none()
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if ch.status != ChallengeStatus.ACTIVE:
        return _challenge_response(ch)

    # Sync balance from portfolio manager (in-memory engine)
    manager = get_portfolio_manager()
    portfolio = manager.get_portfolio(ch.portfolio_id)
    if portfolio:
        ch.current_balance = portfolio.balance

    # Update highest balance (watermark)
    if ch.current_balance > ch.highest_balance:
        ch.highest_balance = ch.current_balance

    # Daily reset check: if the daily_reset_at is from a previous UTC day, reset
    now = datetime.now(timezone.utc)
    if ch.daily_reset_at.date() < now.date():
        ch.daily_start_balance = ch.current_balance
        ch.daily_reset_at = now

    metrics = _compute_metrics(ch)

    # Check failures
    if metrics.is_daily_dd_breached:
        ch.status = ChallengeStatus.FAILED
        ch.fail_reason = f"Daily drawdown limit breached ({metrics.daily_drawdown_pct:.2f}% >= {metrics.daily_drawdown_limit_pct:.2f}%)"
        ch.ended_at = now
        db.add(ActivityFeed(
            user_id=uid,
            activity_type=ActivityType.CHALLENGE_FAILED,
            message=ch.fail_reason,
            challenge_id=ch.id,
        ))

    elif metrics.is_total_dd_breached:
        ch.status = ChallengeStatus.FAILED
        ch.fail_reason = f"Total drawdown limit breached ({metrics.total_drawdown_pct:.2f}% >= {metrics.total_drawdown_limit_pct:.2f}%)"
        ch.ended_at = now
        db.add(ActivityFeed(
            user_id=uid,
            activity_type=ActivityType.CHALLENGE_FAILED,
            message=ch.fail_reason,
            challenge_id=ch.id,
        ))

    elif metrics.is_profit_target_met:
        # Phase progression
        if ch.phase == ChallengePhase.PHASE_1:
            # Advance to Phase 2
            cfg2 = PHASE_CONFIG[ChallengePhase.PHASE_2]
            ch.phase = ChallengePhase.PHASE_2
            ch.starting_balance = ch.current_balance
            ch.highest_balance = ch.current_balance
            ch.daily_start_balance = ch.current_balance
            ch.profit_target = ch.current_balance * (1 + cfg2["profit_target_pct"])
            ch.daily_drawdown_limit = ch.current_balance * cfg2["daily_drawdown_pct"]
            ch.total_drawdown_limit = ch.current_balance * cfg2["total_drawdown_pct"]
            db.add(ActivityFeed(
                user_id=uid,
                activity_type=ActivityType.CHALLENGE_PASSED,
                message="Phase 1 passed! Advanced to Phase 2.",
                challenge_id=ch.id,
            ))

        elif ch.phase == ChallengePhase.PHASE_2:
            # Advance to Funded
            cfg_f = PHASE_CONFIG[ChallengePhase.FUNDED]
            ch.phase = ChallengePhase.FUNDED
            ch.starting_balance = ch.current_balance
            ch.highest_balance = ch.current_balance
            ch.daily_start_balance = ch.current_balance
            ch.profit_target = Decimal("0")  # no target
            ch.daily_drawdown_limit = ch.current_balance * cfg_f["daily_drawdown_pct"]
            ch.total_drawdown_limit = ch.current_balance * cfg_f["total_drawdown_pct"]
            ch.status = ChallengeStatus.PASSED
            ch.ended_at = now
            db.add(ActivityFeed(
                user_id=uid,
                activity_type=ActivityType.CHALLENGE_PASSED,
                message="Challenge completed! You are now funded.",
                challenge_id=ch.id,
            ))

    db.add(ch)
    await db.commit()
    await db.refresh(ch)

    return _challenge_response(ch)
