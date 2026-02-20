"""Checks price alerts against current market prices every 60 seconds."""
from datetime import datetime, timezone
from loguru import logger
from sqlalchemy import select

from app.core.database import async_session_maker
from app.core.config import REDIS_URL, SUPPORTED_SYMBOLS

try:
    from app.models.alerts import PriceAlert

    _AVAILABLE = True
except ImportError:
    _AVAILABLE = False

try:
    import redis.asyncio as aioredis

    _REDIS_AVAILABLE = True
except ImportError:
    aioredis = None
    _REDIS_AVAILABLE = False


async def check_price_alerts():
    if not _AVAILABLE:
        return

    try:
        # Get current prices from Redis (real-time market data)
        current_prices: dict[str, float] = {}
        if _REDIS_AVAILABLE:
            try:
                r = aioredis.from_url(REDIS_URL, decode_responses=True)
                for sym in SUPPORTED_SYMBOLS:
                    key = f"price:{sym}"
                    val = await r.get(key)
                    if val:
                        current_prices[sym] = float(val)
                await r.aclose()
            except Exception:
                pass

        if not current_prices:
            return

        async with async_session_maker() as session:
            result = await session.execute(
                select(PriceAlert).where(
                    PriceAlert.is_active == True,  # noqa: E712
                    PriceAlert.triggered_at == None,  # noqa: E711
                )
            )
            alerts = result.scalars().all()

            triggered = []
            for alert in alerts:
                current = current_prices.get(alert.asset)
                if current is None:
                    continue
                threshold = float(alert.threshold_price)
                triggered_flag = (
                    alert.direction == "above" and current >= threshold
                ) or (alert.direction == "below" and current <= threshold)
                if triggered_flag:
                    alert.triggered_at = datetime.now(timezone.utc)
                    alert.is_active = False
                    triggered.append(alert)
                    logger.info(
                        f"Price alert triggered: {alert.asset} {alert.direction} "
                        f"{threshold} (current: {current})"
                    )

            if triggered:
                await session.commit()
    except Exception as e:
        logger.warning(f"Price alert check failed: {e}")
