"""
Leaderboard API Routes

Endpoints:
- GET /api/leaderboard/24h - Get 24-hour PnL leaderboard from Redis cache
"""

import json

import redis.asyncio as aioredis
from fastapi import APIRouter
from loguru import logger

from app.core.config import REDIS_URL

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


@router.get("/24h")
async def get_leaderboard_24h():
    """Get the 24-hour PnL leaderboard (cached in Redis by scheduled job)."""
    try:
        async with aioredis.from_url(REDIS_URL) as r:
            data = await r.get("leaderboard:24h")

        if data:
            return {"leaderboard": json.loads(data)}
        return {"leaderboard": []}
    except Exception as e:
        logger.error(f"Failed to fetch leaderboard: {e}")
        return {"leaderboard": []}
