"""
Gamification service for Terminal Zero

Handles streaks, achievements, XP awards, and referral logic.
All functions are fire-and-forget safe — they catch exceptions and log warnings
so that gamification failures never break trading operations.
"""

import random
import string
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from loguru import logger
from sqlalchemy import func, select, update

from app.core.database import async_session_maker

# Graceful imports — these tables may not exist yet if migration 004 hasn't run
try:
    from app.models.gamification import Achievement, Streak, XPLedger
    from app.models.referral import Referral, ReferralCredit
    from app.models.user import User

    _MODELS_AVAILABLE = True
except ImportError:
    _MODELS_AVAILABLE = False
    logger.warning("Gamification models not available — skipping gamification features")


# ---------------------------------------------------------------------------
# Achievement definitions
# ---------------------------------------------------------------------------
ACHIEVEMENTS = {
    "first_trade": {
        "name": "First Trade",
        "xp": 50,
        "condition": lambda ctx: ctx.get("trade_count", 0) >= 1,
    },
    "streak_3": {
        "name": "3-Day Streak",
        "xp": 50,
        "condition": lambda ctx: ctx.get("current_streak", 0) >= 3,
    },
    "first_profit": {
        "name": "First Profit",
        "xp": 50,
        "condition": lambda ctx: ctx.get("total_pnl", 0) > 0,
    },
    "high_roller": {
        "name": "High Roller",
        "xp": 100,
        "condition": lambda ctx: ctx.get("largest_trade_value", 0) >= 10000,
    },
    "diversified": {
        "name": "Diversified",
        "xp": 75,
        "condition": lambda ctx: ctx.get("open_positions_count", 0) >= 5,
    },
}


async def generate_referral_code() -> str:
    """Generate a unique 6-character alphanumeric referral code."""
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


async def award_trade_xp(user_id: str, amount: int = 10) -> None:
    """Award XP for completing a trade. Fire-and-forget."""
    if not _MODELS_AVAILABLE:
        return
    try:
        async with async_session_maker() as session:
            uid = uuid.UUID(user_id)
            entry = XPLedger(user_id=uid, amount=amount, reason="trade_executed")
            session.add(entry)
            # Update users.xp_total
            await session.execute(
                update(User)
                .where(User.id == uid)
                .values(xp_total=User.xp_total + amount)
            )
            await session.commit()
    except Exception as e:
        logger.warning(f"XP award failed for {user_id}: {e}")


async def update_streak(user_id: str) -> dict:
    """Update user streak after a trade. Returns new streak data."""
    if not _MODELS_AVAILABLE:
        return {}
    try:
        today = date.today()
        yesterday = today - timedelta(days=1)
        uid = uuid.UUID(user_id)

        async with async_session_maker() as session:
            result = await session.execute(
                select(Streak).where(Streak.user_id == uid)
            )
            streak = result.scalars().first()

            if streak is None:
                streak = Streak(
                    user_id=uid,
                    current_streak=1,
                    longest_streak=1,
                    last_activity_date=today,
                )
                session.add(streak)
                await session.commit()
                return {
                    "current_streak": 1,
                    "longest_streak": 1,
                    "last_activity_date": str(today),
                }

            if streak.last_activity_date == today:
                # Already recorded today
                return {
                    "current_streak": streak.current_streak,
                    "longest_streak": streak.longest_streak,
                    "last_activity_date": str(streak.last_activity_date),
                }

            if streak.last_activity_date == yesterday:
                streak.current_streak += 1
            else:
                streak.current_streak = 1

            if streak.current_streak > streak.longest_streak:
                streak.longest_streak = streak.current_streak

            streak.last_activity_date = today
            streak.updated_at = datetime.now(timezone.utc)
            await session.commit()

            return {
                "current_streak": streak.current_streak,
                "longest_streak": streak.longest_streak,
                "last_activity_date": str(streak.last_activity_date),
            }
    except Exception as e:
        logger.warning(f"Streak update failed for {user_id}: {e}")
        return {}


async def check_and_award_achievements(user_id: str, context: dict) -> list:
    """
    Check all achievement conditions and award any newly unlocked ones.

    context keys: trade_count, current_streak, total_pnl,
                  largest_trade_value, open_positions_count

    Returns list of newly unlocked achievement type strings.
    """
    if not _MODELS_AVAILABLE:
        return []
    try:
        uid = uuid.UUID(user_id)
        newly_unlocked = []

        async with async_session_maker() as session:
            # Fetch already-unlocked achievement types
            result = await session.execute(
                select(Achievement.type).where(Achievement.user_id == uid)
            )
            existing_types = {row[0] for row in result.all()}

            for ach_type, ach_def in ACHIEVEMENTS.items():
                if ach_type in existing_types:
                    continue
                if ach_def["condition"](context):
                    achievement = Achievement(
                        user_id=uid,
                        type=ach_type,
                        xp_awarded=ach_def["xp"],
                    )
                    session.add(achievement)

                    # Award XP for the achievement
                    xp_entry = XPLedger(
                        user_id=uid,
                        amount=ach_def["xp"],
                        reason=f"achievement:{ach_type}",
                    )
                    session.add(xp_entry)

                    # Update users.xp_total
                    await session.execute(
                        update(User)
                        .where(User.id == uid)
                        .values(xp_total=User.xp_total + ach_def["xp"])
                    )

                    newly_unlocked.append(ach_type)

            if newly_unlocked:
                await session.commit()

        return newly_unlocked
    except Exception as e:
        logger.warning(f"Achievement check failed for {user_id}: {e}")
        return []


async def apply_referral_code(user_id: str, code: str) -> dict:
    """Apply a referral code for a new user. Returns {success, message}."""
    if not _MODELS_AVAILABLE:
        return {"success": False, "message": "Gamification not available"}
    try:
        uid = uuid.UUID(user_id)
        code = code.strip().upper()

        async with async_session_maker() as session:
            # Check if user already used a referral
            existing = await session.execute(
                select(Referral).where(Referral.referred_user_id == uid)
            )
            if existing.scalars().first():
                return {"success": False, "message": "Referral code already applied"}

            # Find the referrer by code
            referrer_result = await session.execute(
                select(User).where(User.referral_code == code)
            )
            referrer = referrer_result.scalars().first()
            if not referrer:
                return {"success": False, "message": "Invalid referral code"}

            if referrer.id == uid:
                return {"success": False, "message": "Cannot use your own referral code"}

            # Create referral record
            referral = Referral(
                referrer_id=referrer.id,
                referred_user_id=uid,
                referral_code=code,
            )
            session.add(referral)
            await session.commit()

            return {"success": True, "message": "Referral code applied successfully"}
    except Exception as e:
        logger.warning(f"Referral apply failed for {user_id}: {e}")
        return {"success": False, "message": "Failed to apply referral code"}


async def process_referral_reward(referred_user_id: str) -> None:
    """Called when referred user executes first trade. Grants 30-day Pro credit to both."""
    if not _MODELS_AVAILABLE:
        return
    try:
        uid = uuid.UUID(referred_user_id)

        async with async_session_maker() as session:
            # Find referral record
            result = await session.execute(
                select(Referral).where(
                    Referral.referred_user_id == uid,
                    Referral.reward_granted_at.is_(None),
                )
            )
            referral = result.scalars().first()
            if not referral:
                return

            # Mark reward as granted
            referral.reward_granted_at = datetime.now(timezone.utc)

            # Credit both users 30 days
            for credit_user_id in [referral.referrer_id, referral.referred_user_id]:
                credit = ReferralCredit(
                    user_id=credit_user_id,
                    days_credited=30,
                    reason="referral_first_trade",
                )
                session.add(credit)

            await session.commit()
            logger.info(
                f"Referral reward granted: referrer={referral.referrer_id}, "
                f"referred={referred_user_id}"
            )
    except Exception as e:
        logger.warning(f"Referral reward failed for {referred_user_id}: {e}")
