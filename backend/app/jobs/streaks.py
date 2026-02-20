"""Daily streak reset job"""

from datetime import date, timedelta

from loguru import logger
from sqlalchemy import update

from app.core.database import async_session_maker

try:
    from app.models.gamification import Streak

    _MODELS_AVAILABLE = True
except ImportError:
    _MODELS_AVAILABLE = False


async def reset_daily_streaks():
    """
    Called by scheduler at 00:05 UTC daily.

    Resets current_streak to 0 for users whose last_activity_date
    is before yesterday (i.e., they missed at least one day).
    """
    if not _MODELS_AVAILABLE:
        return

    try:
        yesterday = date.today() - timedelta(days=1)

        async with async_session_maker() as session:
            result = await session.execute(
                update(Streak)
                .where(
                    Streak.current_streak > 0,
                    Streak.last_activity_date < yesterday,
                )
                .values(current_streak=0)
            )
            await session.commit()
            reset_count = result.rowcount
            if reset_count:
                logger.info(f"Reset {reset_count} expired streaks")
    except Exception as e:
        logger.error(f"Failed to reset daily streaks: {e}")
