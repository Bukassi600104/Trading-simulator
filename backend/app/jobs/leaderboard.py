import asyncio
import json
from datetime import datetime, timedelta
from decimal import Decimal

from loguru import logger
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

import redis.asyncio as redis
from app.core.config import REDIS_URL
from app.core.database import async_session_maker
from app.models.journal import JournalEntry
from app.models.portfolio import Portfolio
from app.models.user import User

async def update_leaderboard():
    """
    Calculate 24h PnL for all users and update Redis leaderboard.
    """
    logger.info("🏆 Updating leaderboard...")
    
    try:
        async with async_session_maker() as db:
            # Calculate 24h PnL
            last_24h = datetime.utcnow() - timedelta(hours=24)
            
            # Query: Sum PnL by User for entries in last 24h
            query = (
                select(
                    User.email,
                    func.sum(JournalEntry.pnl).label("total_pnl")
                )
                .join(Portfolio, Portfolio.id == JournalEntry.portfolio_id)
                .join(User, User.id == Portfolio.user_id)
                .where(JournalEntry.exit_time >= last_24h)
                .group_by(User.id)
                .order_by(func.sum(JournalEntry.pnl).desc())
                .limit(100)
            )
            
            result = await db.execute(query)
            rows = result.all()
            
            leaderboard = [
                {"user": email.split("@")[0], "pnl": float(total_pnl)}
                for email, total_pnl in rows
            ]
            
            # Save to Redis
            r = redis.from_url(REDIS_URL)
            await r.set("leaderboard:24h", json.dumps(leaderboard))
            await r.close()
            
            logger.info(f"✅ Leaderboard updated with {len(leaderboard)} users")
            
    except Exception as e:
        logger.error(f"Failed to update leaderboard: {e}")
