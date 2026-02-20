"""Daily job: send trial reminder emails and expire old trials."""
from datetime import datetime, timedelta, timezone
from loguru import logger
from sqlalchemy import select
from app.core.database import async_session_maker
from app.core.config import UserTier

try:
    from app.models.user import User
    _AVAILABLE = True
except ImportError:
    _AVAILABLE = False

async def process_trial_emails():
    if not _AVAILABLE:
        return
    try:
        from app.services.email_service import (
            send_trial_halfway_email, send_trial_expiring_email, send_trial_expired_email
        )
        now = datetime.now(timezone.utc)
        # Day 7 halfway: trial_end_date is between 6.5 and 7.5 days from now
        day7_start = now + timedelta(days=6, hours=12)
        day7_end = now + timedelta(days=7, hours=12)
        # Day 12 expiring: trial_end_date is between 1.5 and 2.5 days from now
        day12_start = now + timedelta(days=1, hours=12)
        day12_end = now + timedelta(days=2, hours=12)
        async with async_session_maker() as session:
            # Halfway reminders
            result = await session.execute(
                select(User).where(User.trial_end_date.between(day7_start, day7_end))
            )
            for user in result.scalars().all():
                days_left = (user.trial_end_date - now).days
                await send_trial_halfway_email(user.email, user.email.split('@')[0], days_left)
                logger.info(f"Sent halfway trial email to {user.email}")
            # Expiring reminders
            result = await session.execute(
                select(User).where(User.trial_end_date.between(day12_start, day12_end))
            )
            for user in result.scalars().all():
                await send_trial_expiring_email(user.email, user.email.split('@')[0])
                logger.info(f"Sent expiring trial email to {user.email}")
            # Expired: trial ended > 24h ago but within last 48h (to avoid repeat sends)
            expired_start = now - timedelta(days=2)
            expired_end = now - timedelta(hours=23)
            result = await session.execute(
                select(User).where(
                    User.trial_end_date.between(expired_start, expired_end),
                    User.tier == UserTier.FREE,
                )
            )
            for user in result.scalars().all():
                await send_trial_expired_email(user.email, user.email.split('@')[0])
                logger.info(f"Sent expired trial email to {user.email}")
    except Exception as e:
        logger.error(f"Trial reminder job failed: {e}")
