"""
Leaderboard API Routes

Endpoints:
- GET /api/leaderboard/24h - Get 24-hour PnL leaderboard with Sharpe ratio (min 5 trades)
- GET /api/leaderboard/weekly - Get 7-day PnL leaderboard with Sharpe ratio (min 5 trades)
"""

import json
import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone

import numpy as np
import redis.asyncio as aioredis
from fastapi import APIRouter
from loguru import logger
from sqlalchemy import func, select

from app.core.config import DEFAULT_STARTING_BALANCE, REDIS_URL
from app.core.database import async_session_maker
from app.models.journal import JournalEntry
from app.models.portfolio import Portfolio
from app.models.user import User

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


async def _build_leaderboard(hours: int) -> list:
    """Build a leaderboard for a given time window.

    Filters to users with >= 5 trades and includes Sharpe ratio.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    try:
        async with async_session_maker() as db:
            # Get users with >= 5 trades in the time window
            query = (
                select(
                    User.id,
                    User.email,
                    func.sum(JournalEntry.pnl).label("total_pnl"),
                    func.count(JournalEntry.id).label("trade_count"),
                )
                .join(Portfolio, Portfolio.id == JournalEntry.portfolio_id)
                .join(User, User.id == Portfolio.user_id)
                .where(JournalEntry.exit_time >= cutoff)
                .group_by(User.id)
                .having(func.count(JournalEntry.id) >= 5)
                .order_by(func.sum(JournalEntry.pnl).desc())
                .limit(100)
            )

            result = await db.execute(query)
            rows = result.all()

            if not rows:
                return []

            # For each user, compute Sharpe ratio
            user_ids = [row.id for row in rows]
            entries_query = (
                select(JournalEntry.portfolio_id, JournalEntry.pnl, JournalEntry.exit_time, Portfolio.user_id, Portfolio.starting_balance)
                .join(Portfolio, Portfolio.id == JournalEntry.portfolio_id)
                .where(
                    Portfolio.user_id.in_(user_ids),
                    JournalEntry.exit_time >= cutoff,
                )
            )
            entries_result = await db.execute(entries_query)
            all_entries = entries_result.all()

            # Group by user
            user_entries: dict[str, list] = defaultdict(list)
            user_starting_balance: dict[str, float] = {}
            for entry in all_entries:
                uid = str(entry.user_id)
                user_entries[uid].append(entry)
                if uid not in user_starting_balance:
                    user_starting_balance[uid] = float(entry.starting_balance) if entry.starting_balance else float(DEFAULT_STARTING_BALANCE)

            leaderboard = []
            for row in rows:
                uid = str(row.id)
                starting_bal = user_starting_balance.get(uid, float(DEFAULT_STARTING_BALANCE))
                sharpe = _calc_user_sharpe(user_entries.get(uid, []), starting_bal)

                leaderboard.append({
                    "user": row.email.split("@")[0] if row.email else "anonymous",
                    "pnl": float(row.total_pnl),
                    "trade_count": row.trade_count,
                    "sharpe_ratio": round(sharpe, 4),
                })

            return leaderboard

    except Exception as e:
        logger.error(f"Failed to build leaderboard: {e}")
        return []


def _calc_user_sharpe(entries: list, starting_balance: float) -> float:
    """Calculate Sharpe ratio for a user's entries."""
    daily_pnl: dict[str, float] = defaultdict(float)
    for entry in entries:
        if entry.exit_time:
            dt = entry.exit_time
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            date_key = dt.strftime("%Y-%m-%d")
            daily_pnl[date_key] += float(entry.pnl)

    if len(daily_pnl) < 2:
        return 0.0

    daily_returns = np.array([
        pnl / starting_balance for pnl in daily_pnl.values()
    ])

    std = float(np.std(daily_returns, ddof=1))
    if std == 0:
        return 0.0

    mean_return = float(np.mean(daily_returns))
    return (mean_return / std) * math.sqrt(252)


@router.get("/24h")
async def get_leaderboard_24h():
    """Get the 24-hour PnL leaderboard with Sharpe ratio (min 5 trades filter)."""
    try:
        async with aioredis.from_url(REDIS_URL, decode_responses=True) as r:
            data = await r.get("leaderboard:24h")

        if data:
            return {"leaderboard": json.loads(data)}

        # Fallback: compute on the fly
        leaderboard = await _build_leaderboard(hours=24)
        return {"leaderboard": leaderboard}
    except Exception as e:
        logger.error(f"Failed to fetch leaderboard: {e}")
        return {"leaderboard": []}


@router.get("/weekly")
async def get_leaderboard_weekly():
    """Get the 7-day PnL leaderboard with Sharpe ratio (min 5 trades filter)."""
    try:
        async with aioredis.from_url(REDIS_URL, decode_responses=True) as r:
            data = await r.get("leaderboard:weekly")

        if data:
            return {"leaderboard": json.loads(data)}

        # Fallback: compute on the fly
        leaderboard = await _build_leaderboard(hours=168)
        return {"leaderboard": leaderboard}
    except Exception as e:
        logger.error(f"Failed to fetch weekly leaderboard: {e}")
        return {"leaderboard": []}
