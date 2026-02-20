"""AI Coaching API Routes"""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import TokenData, get_user_id_from_token, require_auth
from app.services.ai_coaching import generate_trade_insight, store_trade_insight

router = APIRouter(prefix="/api/coaching", tags=["coaching"])


def _check_pro_tier(user_tier: str):
    """Raise 403 if user is not Pro or above."""
    if user_tier not in ("PRO", "ELITE", "PROP_CHALLENGE"):
        raise HTTPException(
            status_code=403,
            detail="AI coaching is a Pro feature. Upgrade to access trade insights.",
        )


@router.get("/feed")
async def get_coaching_feed(
    token_data: TokenData = Depends(require_auth),
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_session),
):
    """Get recent trades with AI coaching insights."""
    uid = get_user_id_from_token(token_data)

    user_row = await db.execute(
        text("SELECT tier FROM users WHERE id = :uid"), {"uid": str(uid)}
    )
    user = user_row.mappings().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    _check_pro_tier(user["tier"])

    port_row = await db.execute(
        text("SELECT id FROM portfolios WHERE user_id = :uid"), {"uid": str(uid)}
    )
    portfolio = port_row.mappings().first()
    if not portfolio:
        return []

    result = await db.execute(
        text(
            """
            SELECT
                j.id as trade_id,
                j.symbol,
                j.side,
                j.entry_price,
                j.exit_price,
                j.pnl,
                j.pnl_percent,
                j.entry_time,
                j.exit_time,
                j.qty,
                ti.insight_text,
                ti.model,
                ti.created_at as insight_created_at
            FROM journal_entries j
            LEFT JOIN trade_insights ti ON ti.trade_id = j.id::text
            WHERE j.portfolio_id = :portfolio_id
            ORDER BY j.exit_time DESC
            LIMIT :limit
            """
        ),
        {"portfolio_id": str(portfolio["id"]), "limit": limit},
    )

    rows = result.mappings().all()
    return [
        {
            "trade_id": str(row["trade_id"]),
            "symbol": row["symbol"],
            "side": row["side"],
            "entry_price": float(row["entry_price"]),
            "exit_price": float(row["exit_price"]),
            "pnl": float(row["pnl"]),
            "pnl_percent": float(row["pnl_percent"]),
            "entry_time": row["entry_time"].isoformat() if row["entry_time"] else None,
            "exit_time": row["exit_time"].isoformat() if row["exit_time"] else None,
            "qty": float(row["qty"]),
            "insight_text": row["insight_text"],
            "model": row["model"],
        }
        for row in rows
    ]


@router.get("/trade/{trade_id}")
async def get_trade_insight(
    trade_id: str,
    token_data: TokenData = Depends(require_auth),
    db: AsyncSession = Depends(get_session),
):
    """Get AI insight for a specific trade."""
    uid = get_user_id_from_token(token_data)

    try:
        uuid.UUID(trade_id)
    except ValueError as err:
        raise HTTPException(status_code=400, detail="Invalid trade_id") from err

    user_row = await db.execute(
        text("SELECT tier FROM users WHERE id = :uid"), {"uid": str(uid)}
    )
    user = user_row.mappings().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    _check_pro_tier(user["tier"])

    result = await db.execute(
        text(
            "SELECT insight_text, model, created_at FROM trade_insights WHERE trade_id = :tid"
        ),
        {"tid": trade_id},
    )
    row = result.mappings().first()

    if not row:
        return {"trade_id": trade_id, "insight_text": None, "model": None}

    return {
        "trade_id": trade_id,
        "insight_text": row["insight_text"],
        "model": row["model"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
    }


@router.post("/regenerate/{trade_id}")
async def regenerate_insight(
    trade_id: str,
    token_data: TokenData = Depends(require_auth),
    db: AsyncSession = Depends(get_session),
):
    """Regenerate AI insight for a trade. Rate limited: must wait 1 hour."""
    uid = get_user_id_from_token(token_data)

    try:
        uuid.UUID(trade_id)
    except ValueError as err:
        raise HTTPException(status_code=400, detail="Invalid trade_id") from err

    user_row = await db.execute(
        text("SELECT tier FROM users WHERE id = :uid"), {"uid": str(uid)}
    )
    user = user_row.mappings().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    _check_pro_tier(user["tier"])

    existing = await db.execute(
        text(
            "SELECT created_at FROM trade_insights WHERE trade_id = :tid ORDER BY created_at DESC LIMIT 1"
        ),
        {"tid": trade_id},
    )
    last_row = existing.mappings().first()
    if last_row and last_row["created_at"]:
        last_time = last_row["created_at"]
        if last_time.tzinfo is None:
            last_time = last_time.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) - last_time < timedelta(hours=1):
            raise HTTPException(
                status_code=429,
                detail="Insight was generated less than 1 hour ago. Please wait before regenerating.",
            )

    journal_row = await db.execute(
        text(
            """
            SELECT j.symbol, j.side, j.entry_price, j.exit_price, j.pnl,
                   j.pnl_percent, j.qty, j.entry_time, j.exit_time
            FROM journal_entries j
            JOIN portfolios p ON j.portfolio_id = p.id
            WHERE j.id = :tid AND p.user_id = :uid
            """
        ),
        {"tid": trade_id, "uid": str(uid)},
    )
    trade = journal_row.mappings().first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    duration_hours = 0.0
    if trade["entry_time"] and trade["exit_time"]:
        delta = trade["exit_time"] - trade["entry_time"]
        duration_hours = delta.total_seconds() / 3600

    trade_data = {
        "symbol": trade["symbol"],
        "side": trade["side"],
        "entry_price": float(trade["entry_price"]),
        "exit_price": float(trade["exit_price"]),
        "pnl": float(trade["pnl"]),
        "pnl_percent": float(trade["pnl_percent"]),
        "duration_hours": duration_hours,
        "qty": float(trade["qty"]),
    }

    insight = await generate_trade_insight(trade_data, user["tier"])
    if not insight:
        raise HTTPException(
            status_code=503,
            detail="AI coaching service is currently unavailable.",
        )

    await db.execute(
        text("DELETE FROM trade_insights WHERE trade_id = :tid"), {"tid": trade_id}
    )
    await db.commit()

    await store_trade_insight(trade_id, insight)

    return {"trade_id": trade_id, "insight_text": insight, "regenerated": True}
