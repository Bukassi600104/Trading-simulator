"""Account management API — GDPR-compliant data export and account deletion."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    TokenData,
    blacklist_token,
    require_auth,
)
from app.models.gamification import Achievement, Streak
from app.models.journal import JournalEntry
from app.models.portfolio import Portfolio
from app.models.user import User

router = APIRouter(prefix="/api/account", tags=["account"])


# ---------------------------------------------------------------------------
# GET /api/account/export
# ---------------------------------------------------------------------------


@router.get("/export")
async def export_user_data(
    token_data: TokenData = Depends(require_auth),
    session: AsyncSession = Depends(get_session),
):
    """
    Export all personal data held for the authenticated user as a JSON download.

    Returns a JSONResponse with Content-Disposition: attachment so browsers
    treat the response as a file download.
    """
    uid = uuid.UUID(token_data.user_id)

    user_result = await session.execute(select(User).where(User.id == uid))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user_data = {
        "id": str(user.id),
        "email": user.email,
        "tier": user.tier.value,
        "xp_total": user.xp_total,
        "referral_code": user.referral_code,
        "trial_end_date": user.trial_end_date.isoformat() if user.trial_end_date else None,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat(),
        "updated_at": user.updated_at.isoformat(),
    }

    portfolio_result = await session.execute(
        select(Portfolio).where(Portfolio.user_id == uid)
    )
    portfolios = portfolio_result.scalars().all()

    portfolios_data = []
    for portfolio in portfolios:
        journal_result = await session.execute(
            select(JournalEntry).where(JournalEntry.portfolio_id == portfolio.id)
        )
        journal_entries = journal_result.scalars().all()

        journal_data = [
            {
                "id": str(entry.id),
                "symbol": entry.symbol,
                "side": entry.side,
                "entry_price": str(entry.entry_price),
                "exit_price": str(entry.exit_price),
                "qty": str(entry.qty),
                "pnl": str(entry.pnl),
                "pnl_percent": str(entry.pnl_percent),
                "entry_time": entry.entry_time.isoformat(),
                "exit_time": entry.exit_time.isoformat(),
                "notes": entry.notes,
                "tags": entry.tags,
                "emotion": entry.emotion,
                "mistake": entry.mistake,
            }
            for entry in journal_entries
        ]

        portfolios_data.append(
            {
                "id": str(portfolio.id),
                "balance": str(portfolio.balance),
                "starting_balance": str(portfolio.starting_balance),
                "leverage": portfolio.leverage,
                "is_liquidated": portfolio.is_liquidated,
                "is_active": portfolio.is_active,
                "created_at": portfolio.created_at.isoformat(),
                "updated_at": portfolio.updated_at.isoformat(),
                "journal_entries": journal_data,
            }
        )

    ach_result = await session.execute(
        select(Achievement).where(Achievement.user_id == uid)
    )
    achievements_data = [
        {
            "type": ach.type,
            "xp_awarded": ach.xp_awarded,
            "unlocked_at": ach.unlocked_at.isoformat(),
        }
        for ach in ach_result.scalars().all()
    ]

    streak_result = await session.execute(
        select(Streak).where(Streak.user_id == uid)
    )
    streak = streak_result.scalar_one_or_none()
    streak_data = (
        {
            "current_streak": streak.current_streak,
            "longest_streak": streak.longest_streak,
            "last_activity_date": (
                str(streak.last_activity_date) if streak.last_activity_date else None
            ),
        }
        if streak
        else None
    )

    payload = {
        "export_generated_at": datetime.now(timezone.utc).isoformat(),
        "user": user_data,
        "portfolios": portfolios_data,
        "achievements": achievements_data,
        "streak": streak_data,
    }

    filename = f"terminal-zero-data-{uid}.json"
    return JSONResponse(
        content=payload,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# DELETE /api/account
# ---------------------------------------------------------------------------


@router.delete("")
async def delete_account(
    token_data: TokenData = Depends(require_auth),
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
    session: AsyncSession = Depends(get_session),
):
    """
    Soft-delete the authenticated user's account.

    PII is anonymised in-place and the current access token is immediately
    blacklisted.
    """
    uid = uuid.UUID(token_data.user_id)

    user_result = await session.execute(select(User).where(User.id == uid))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.email = f"deleted_{user.id}@deleted.local"
    user.hashed_password = "DELETED"
    user.trial_end_date = None
    user.is_active = False

    await session.commit()
    logger.info(f"Account soft-deleted for user {uid}")

    access_token = credentials.credentials
    if token_data.exp:
        remaining = max(
            int((token_data.exp - datetime.now(timezone.utc)).total_seconds()), 0
        )
    else:
        remaining = ACCESS_TOKEN_EXPIRE_MINUTES * 60

    await blacklist_token(access_token, remaining)

    return {"message": "Account deleted successfully"}
