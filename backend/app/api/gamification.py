"""
Gamification API Routes

Endpoints for streaks, achievements, XP, and referrals.
All endpoints require authentication.
"""

import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select

from app.core.database import async_session_maker
from app.core.security import TokenData, get_user_id_from_token, require_auth
from app.services.gamification import (
    ACHIEVEMENTS,
    apply_referral_code,
    generate_referral_code,
)

# Graceful imports for models
try:
    from app.models.gamification import Achievement, Streak, XPLedger
    from app.models.referral import Referral, ReferralCredit
    from app.models.user import User

    _MODELS_AVAILABLE = True
except ImportError:
    _MODELS_AVAILABLE = False

router = APIRouter(prefix="/api/gamification", tags=["gamification"])


def _require_models():
    if not _MODELS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Gamification not available yet")


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class ApplyReferralRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=10)


# ---------------------------------------------------------------------------
# Streak endpoints
# ---------------------------------------------------------------------------

@router.get("/streak")
async def get_streak(
    token_data: TokenData = Depends(require_auth),
):
    """Get current user's streak data."""
    _require_models()
    uid = get_user_id_from_token(token_data)

    async with async_session_maker() as session:
        result = await session.execute(
            select(Streak).where(Streak.user_id == uid)
        )
        streak = result.scalars().first()

    if not streak:
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "last_activity_date": None,
        }

    return {
        "current_streak": streak.current_streak,
        "longest_streak": streak.longest_streak,
        "last_activity_date": str(streak.last_activity_date) if streak.last_activity_date else None,
    }


# ---------------------------------------------------------------------------
# Achievement endpoints
# ---------------------------------------------------------------------------

@router.get("/achievements")
async def get_achievements(
    token_data: TokenData = Depends(require_auth),
):
    """Get all achievements with locked/unlocked status and progress hints."""
    _require_models()
    uid = get_user_id_from_token(token_data)

    async with async_session_maker() as session:
        result = await session.execute(
            select(Achievement).where(Achievement.user_id == uid)
        )
        unlocked = {a.type: a for a in result.scalars().all()}

    achievements = []
    for ach_type, ach_def in ACHIEVEMENTS.items():
        unlocked_ach = unlocked.get(ach_type)
        achievements.append({
            "type": ach_type,
            "name": ach_def["name"],
            "xp": ach_def["xp"],
            "unlocked": unlocked_ach is not None,
            "unlocked_at": str(unlocked_ach.unlocked_at) if unlocked_ach else None,
        })

    return {"achievements": achievements}


# ---------------------------------------------------------------------------
# XP endpoints
# ---------------------------------------------------------------------------

@router.get("/xp")
async def get_xp(
    token_data: TokenData = Depends(require_auth),
):
    """Get user's total XP and recent XP log."""
    _require_models()
    uid = get_user_id_from_token(token_data)

    async with async_session_maker() as session:
        # Get total XP from user record
        user_result = await session.execute(
            select(User.xp_total).where(User.id == uid)
        )
        row = user_result.first()
        total_xp = row[0] if row else 0

        # Get recent XP entries
        log_result = await session.execute(
            select(XPLedger)
            .where(XPLedger.user_id == uid)
            .order_by(desc(XPLedger.created_at))
            .limit(20)
        )
        entries = log_result.scalars().all()

    return {
        "total_xp": total_xp,
        "recent_log": [
            {
                "amount": e.amount,
                "reason": e.reason,
                "date": str(e.created_at),
            }
            for e in entries
        ],
    }


# ---------------------------------------------------------------------------
# Referral endpoints
# ---------------------------------------------------------------------------

@router.get("/referral")
async def get_referral(
    token_data: TokenData = Depends(require_auth),
):
    """Get user's referral code, link, and stats."""
    _require_models()
    uid = get_user_id_from_token(token_data)

    async with async_session_maker() as session:
        # Get or create referral code
        user_result = await session.execute(
            select(User).where(User.id == uid)
        )
        user = user_result.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        referral_code = user.referral_code
        if not referral_code:
            referral_code = await generate_referral_code()
            user.referral_code = referral_code
            await session.commit()

        # Count successful referrals
        count_result = await session.execute(
            select(func.count())
            .select_from(Referral)
            .where(Referral.referrer_id == uid)
        )
        referral_count = count_result.scalar() or 0

        # Sum reward days earned
        days_result = await session.execute(
            select(func.coalesce(func.sum(ReferralCredit.days_credited), 0))
            .where(ReferralCredit.user_id == uid)
        )
        rewards_earned_days = days_result.scalar() or 0

    return {
        "referral_code": referral_code,
        "referral_link": f"https://terminalzero.com/join?ref={referral_code}",
        "referral_count": referral_count,
        "rewards_earned_days": rewards_earned_days,
    }


@router.post("/referral/apply")
async def apply_referral(
    request: ApplyReferralRequest,
    token_data: TokenData = Depends(require_auth),
):
    """Apply a referral code."""
    _require_models()
    uid = get_user_id_from_token(token_data)

    result = await apply_referral_code(str(uid), request.code)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])

    return result
