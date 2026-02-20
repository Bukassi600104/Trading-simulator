"""
Portfolio Statistics API Routes

Endpoints:
- GET /api/portfolio/stats - Comprehensive trading statistics (Sharpe ratio, drawdown, win rate)
- GET /api/portfolio/holdings - Current open positions from in-memory engine
- GET /api/portfolio/trades - Paginated trade history from journal entries
- GET /api/portfolio/summary - Portfolio balance/equity summary
"""

import json
import math
import uuid
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

import numpy as np
import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger
from sqlalchemy import func, select

from app.core.config import DEFAULT_STARTING_BALANCE, REDIS_URL
from app.core.database import async_session_maker
from app.core.security import TokenData, get_user_id_from_token, require_auth
from app.models.journal import JournalEntry
from app.models.portfolio import Portfolio
from jesse_custom.engine import get_portfolio_manager

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])

CACHE_TTL = 5  # seconds


async def _get_redis():
    return aioredis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=5)


async def _get_cached(key: str):
    """Try to get cached data from Redis."""
    try:
        async with await _get_redis() as r:
            data = await r.get(key)
            if data:
                return json.loads(data)
    except Exception:
        pass
    return None


async def _set_cache(key: str, data: dict):
    """Cache data in Redis with TTL."""
    try:
        async with await _get_redis() as r:
            await r.setex(key, CACHE_TTL, json.dumps(data, default=str))
    except Exception:
        pass


def _get_user_id(token_data: TokenData) -> uuid.UUID:
    return get_user_id_from_token(token_data)


@router.get("/stats")
async def get_portfolio_stats(
    token_data: TokenData = Depends(require_auth),
):
    """Get comprehensive portfolio statistics computed from journal entries."""
    user_id = _get_user_id(token_data)
    cache_key = f"portfolio_stats:{user_id}"

    cached = await _get_cached(cache_key)
    if cached:
        return cached

    async with async_session_maker() as session:
        # Get portfolio
        result = await session.execute(
            select(Portfolio).where(Portfolio.user_id == user_id)
        )
        db_portfolio = result.scalars().first()

        if not db_portfolio:
            empty = _empty_stats()
            await _set_cache(cache_key, empty)
            return empty

        starting_balance = float(db_portfolio.starting_balance)
        portfolio_id = db_portfolio.id

        # Get all journal entries for this portfolio
        result = await session.execute(
            select(JournalEntry)
            .where(JournalEntry.portfolio_id == portfolio_id)
            .order_by(JournalEntry.exit_time.asc())
        )
        entries = result.scalars().all()

    if not entries:
        empty = _empty_stats()
        await _set_cache(cache_key, empty)
        return empty

    # Compute stats
    total_trades = len(entries)
    wins = [e for e in entries if float(e.pnl) > 0]
    losses = [e for e in entries if float(e.pnl) < 0]

    win_rate = (len(wins) / total_trades * 100) if total_trades > 0 else 0.0
    avg_win = (sum(float(e.pnl) for e in wins) / len(wins)) if wins else 0.0
    avg_loss = (sum(float(e.pnl) for e in losses) / len(losses)) if losses else 0.0

    total_realized_pnl = sum(float(e.pnl) for e in entries)

    # Best and worst trade
    best_entry = max(entries, key=lambda e: float(e.pnl))
    worst_entry = min(entries, key=lambda e: float(e.pnl))

    best_trade = {
        "symbol": best_entry.symbol,
        "pnl": float(best_entry.pnl),
        "pnl_percent": float(best_entry.pnl_percent),
        "date": best_entry.exit_time.isoformat() if best_entry.exit_time else None,
    }
    worst_trade = {
        "symbol": worst_entry.symbol,
        "pnl": float(worst_entry.pnl),
        "pnl_percent": float(worst_entry.pnl_percent),
        "date": worst_entry.exit_time.isoformat() if worst_entry.exit_time else None,
    }

    # Most traded pair
    symbol_counts = Counter(e.symbol for e in entries)
    most_traded_pair = symbol_counts.most_common(1)[0][0] if symbol_counts else ""

    # Max drawdown
    max_drawdown_percent = _calc_max_drawdown(entries, starting_balance)

    # Sharpe ratio
    sharpe_ratio = _calc_sharpe_ratio(entries, starting_balance)

    # Unrealized PnL from in-memory engine
    total_unrealized_pnl = 0.0
    try:
        manager = get_portfolio_manager()
        portfolio = manager.get_portfolio(user_id)
        if portfolio:
            total_unrealized_pnl = float(portfolio.total_unrealized_pnl)
    except Exception:
        pass

    all_time_pnl = total_realized_pnl + total_unrealized_pnl

    # Daily PnL (trades closed today UTC)
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    daily_pnl = sum(
        float(e.pnl) for e in entries
        if e.exit_time and e.exit_time.replace(tzinfo=timezone.utc if e.exit_time.tzinfo is None else e.exit_time.tzinfo) >= today_start
    )

    # Equity curve (last 30 days)
    equity_curve = _calc_equity_curve(entries, starting_balance, days=30)

    stats = {
        "total_trades": total_trades,
        "win_rate": round(win_rate, 2),
        "avg_win": round(avg_win, 2),
        "avg_loss": round(avg_loss, 2),
        "best_trade": best_trade,
        "worst_trade": worst_trade,
        "max_drawdown_percent": round(max_drawdown_percent, 2),
        "sharpe_ratio": round(sharpe_ratio, 4),
        "most_traded_pair": most_traded_pair,
        "total_realized_pnl": round(total_realized_pnl, 2),
        "total_unrealized_pnl": round(total_unrealized_pnl, 2),
        "all_time_pnl": round(all_time_pnl, 2),
        "daily_pnl": round(daily_pnl, 2),
        "equity_curve": equity_curve,
    }

    await _set_cache(cache_key, stats)
    return stats


@router.get("/holdings")
async def get_portfolio_holdings(
    token_data: TokenData = Depends(require_auth),
):
    """Get current open positions from in-memory portfolio engine."""
    user_id = _get_user_id(token_data)
    cache_key = f"portfolio_holdings:{user_id}"

    cached = await _get_cached(cache_key)
    if cached:
        return cached

    manager = get_portfolio_manager()
    portfolio = manager.get_portfolio(user_id)

    if not portfolio:
        result = {"holdings": []}
        await _set_cache(cache_key, result)
        return result

    holdings = []
    for symbol, pos in portfolio.positions.items():
        if not pos.is_open:
            continue
        qty = float(pos.qty)
        entry_price = float(pos.entry_price)
        current_price = float(pos.current_price)
        unrealized_pnl = float(pos.unrealized_pnl)
        value_usdt = abs(qty) * current_price
        pnl_percent = float(pos.roi_percent) if pos.margin_used > 0 else 0.0

        holdings.append({
            "asset": symbol,
            "qty": qty,
            "avg_entry_price": entry_price,
            "current_price": current_price,
            "unrealized_pnl": round(unrealized_pnl, 2),
            "pnl_percent": round(pnl_percent, 2),
            "value_usdt": round(value_usdt, 2),
        })

    result = {"holdings": holdings}
    await _set_cache(cache_key, result)
    return result


@router.get("/trades")
async def get_portfolio_trades(
    token_data: TokenData = Depends(require_auth),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    symbol: Optional[str] = Query(None),
    side: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    """Get paginated trade history from journal entries."""
    user_id = _get_user_id(token_data)
    cache_key = f"portfolio_trades:{user_id}:{page}:{limit}:{symbol}:{side}:{status}"

    cached = await _get_cached(cache_key)
    if cached:
        return cached

    async with async_session_maker() as session:
        # Get portfolio
        result = await session.execute(
            select(Portfolio).where(Portfolio.user_id == user_id)
        )
        db_portfolio = result.scalars().first()

        if not db_portfolio:
            result = {"trades": [], "total": 0, "page": page, "pages": 0}
            await _set_cache(cache_key, result)
            return result

        # Build query
        query = select(JournalEntry).where(
            JournalEntry.portfolio_id == db_portfolio.id
        )
        count_query = select(func.count(JournalEntry.id)).where(
            JournalEntry.portfolio_id == db_portfolio.id
        )

        if symbol:
            query = query.where(JournalEntry.symbol == symbol)
            count_query = count_query.where(JournalEntry.symbol == symbol)
        if side:
            query = query.where(JournalEntry.side == side.upper())
            count_query = count_query.where(JournalEntry.side == side.upper())

        # Get total count
        total_result = await session.execute(count_query)
        total = total_result.scalar() or 0

        # Paginate
        offset = (page - 1) * limit
        query = query.order_by(JournalEntry.exit_time.desc()).offset(offset).limit(limit)

        result = await session.execute(query)
        entries = result.scalars().all()

    pages = math.ceil(total / limit) if total > 0 else 0

    trades = [
        {
            "id": str(e.id),
            "symbol": e.symbol,
            "side": e.side,
            "entry_price": float(e.entry_price),
            "exit_price": float(e.exit_price),
            "qty": float(e.qty),
            "pnl": float(e.pnl),
            "pnl_percent": float(e.pnl_percent),
            "entry_time": e.entry_time.isoformat() if e.entry_time else None,
            "exit_time": e.exit_time.isoformat() if e.exit_time else None,
            "notes": e.notes,
            "tags": e.tags,
            "emotion": e.emotion,
        }
        for e in entries
    ]

    response = {"trades": trades, "total": total, "page": page, "pages": pages}
    await _set_cache(cache_key, response)
    return response


@router.get("/summary")
async def get_portfolio_summary(
    token_data: TokenData = Depends(require_auth),
):
    """Get portfolio balance/equity summary."""
    user_id = _get_user_id(token_data)
    cache_key = f"portfolio_summary:{user_id}"

    cached = await _get_cached(cache_key)
    if cached:
        return cached

    manager = get_portfolio_manager()
    portfolio = manager.get_portfolio(user_id)

    if not portfolio:
        # Try to load from DB
        async with async_session_maker() as session:
            result = await session.execute(
                select(Portfolio).where(Portfolio.user_id == user_id)
            )
            db_portfolio = result.scalars().first()

        if db_portfolio:
            summary = {
                "balance": float(db_portfolio.balance),
                "equity": float(db_portfolio.balance),
                "unrealized_pnl": 0.0,
                "realized_pnl": 0.0,
                "daily_pnl": 0.0,
                "total_pnl_percent": 0.0,
                "open_positions_count": 0,
            }
        else:
            summary = {
                "balance": float(DEFAULT_STARTING_BALANCE),
                "equity": float(DEFAULT_STARTING_BALANCE),
                "unrealized_pnl": 0.0,
                "realized_pnl": 0.0,
                "daily_pnl": 0.0,
                "total_pnl_percent": 0.0,
                "open_positions_count": 0,
            }
        await _set_cache(cache_key, summary)
        return summary

    balance = float(portfolio.balance)
    equity = float(portfolio.equity)
    unrealized_pnl = float(portfolio.total_unrealized_pnl)
    realized_pnl = float(portfolio.total_realized_pnl)
    starting = float(portfolio.starting_balance) if hasattr(portfolio, 'starting_balance') else float(DEFAULT_STARTING_BALANCE)

    # Daily PnL from journal entries
    daily_pnl = 0.0
    try:
        async with async_session_maker() as session:
            result = await session.execute(
                select(Portfolio).where(Portfolio.user_id == user_id)
            )
            db_portfolio = result.scalars().first()
            if db_portfolio:
                today_start = datetime.now(timezone.utc).replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
                result = await session.execute(
                    select(func.sum(JournalEntry.pnl))
                    .where(
                        JournalEntry.portfolio_id == db_portfolio.id,
                        JournalEntry.exit_time >= today_start,
                    )
                )
                daily_sum = result.scalar()
                if daily_sum:
                    daily_pnl = float(daily_sum)
    except Exception:
        pass

    total_pnl = equity - starting
    total_pnl_percent = (total_pnl / starting * 100) if starting > 0 else 0.0

    summary = {
        "balance": round(balance, 2),
        "equity": round(equity, 2),
        "unrealized_pnl": round(unrealized_pnl, 2),
        "realized_pnl": round(realized_pnl, 2),
        "daily_pnl": round(daily_pnl, 2),
        "total_pnl_percent": round(total_pnl_percent, 2),
        "open_positions_count": portfolio.open_position_count,
    }

    await _set_cache(cache_key, summary)
    return summary


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _empty_stats() -> dict:
    return {
        "total_trades": 0,
        "win_rate": 0.0,
        "avg_win": 0.0,
        "avg_loss": 0.0,
        "best_trade": None,
        "worst_trade": None,
        "max_drawdown_percent": 0.0,
        "sharpe_ratio": 0.0,
        "most_traded_pair": "",
        "total_realized_pnl": 0.0,
        "total_unrealized_pnl": 0.0,
        "all_time_pnl": 0.0,
        "daily_pnl": 0.0,
        "equity_curve": [],
    }


def _calc_max_drawdown(entries: list, starting_balance: float) -> float:
    """Calculate max drawdown percentage from journal entries."""
    peak = starting_balance
    max_dd = 0.0
    cumulative_pnl = 0.0

    for entry in entries:
        cumulative_pnl += float(entry.pnl)
        equity = starting_balance + cumulative_pnl

        if equity > peak:
            peak = equity

        if peak > 0 and equity < peak:
            drawdown = (peak - equity) / peak * 100
            if drawdown > max_dd:
                max_dd = drawdown

    return max_dd


def _calc_sharpe_ratio(entries: list, starting_balance: float) -> float:
    """Calculate annualized Sharpe ratio from journal entries.

    Groups entries by date (UTC), computes daily returns,
    then: sharpe = mean(daily_returns) / std(daily_returns) * sqrt(252)
    Returns 0 if fewer than 2 data points or std is 0.
    """
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
    sharpe = (mean_return / std) * math.sqrt(252)
    return sharpe


def _calc_equity_curve(entries: list, starting_balance: float, days: int = 30) -> list:
    """Build equity curve for the last N days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Compute cumulative PnL up to cutoff (baseline)
    baseline_pnl = 0.0
    recent_entries = []
    for entry in entries:
        if entry.exit_time:
            dt = entry.exit_time
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            if dt < cutoff:
                baseline_pnl += float(entry.pnl)
            else:
                recent_entries.append(entry)

    # Group recent entries by date
    daily_pnl: dict[str, float] = defaultdict(float)
    for entry in recent_entries:
        dt = entry.exit_time
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        date_key = dt.strftime("%Y-%m-%d")
        daily_pnl[date_key] += float(entry.pnl)

    # Build curve
    curve = []
    cumulative = starting_balance + baseline_pnl

    # Fill in days
    current = cutoff
    now = datetime.now(timezone.utc)
    while current <= now:
        date_key = current.strftime("%Y-%m-%d")
        cumulative += daily_pnl.get(date_key, 0.0)
        curve.append({
            "timestamp": date_key,
            "balance": round(cumulative, 2),
        })
        current += timedelta(days=1)

    return curve
