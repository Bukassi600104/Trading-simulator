import json

import redis.asyncio as redis
from loguru import logger

from app.core.config import REDIS_URL


async def update_leaderboard():
    """
    Calculate 24h and weekly leaderboards and cache in Redis.
    Uses the shared _build_leaderboard helper from the API module.
    """
    logger.info("Updating leaderboards...")

    try:
        from app.api.leaderboard import _build_leaderboard

        leaderboard_24h = await _build_leaderboard(hours=24)
        leaderboard_weekly = await _build_leaderboard(hours=168)

        async with redis.from_url(REDIS_URL, decode_responses=True) as r:
            await r.set("leaderboard:24h", json.dumps(leaderboard_24h, default=str))
            await r.set("leaderboard:weekly", json.dumps(leaderboard_weekly, default=str))

        logger.info(
            f"Leaderboards updated: 24h={len(leaderboard_24h)} users, "
            f"weekly={len(leaderboard_weekly)} users"
        )

    except Exception as e:
        logger.error(f"Failed to update leaderboard: {e}")
