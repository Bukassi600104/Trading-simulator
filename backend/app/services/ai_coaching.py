"""AI Trade Coaching Service - Claude API integration for post-trade insights"""

import os

from anthropic import AsyncAnthropic
from loguru import logger

client = None


def get_anthropic_client():
    global client
    if client is None and os.getenv("ANTHROPIC_API_KEY"):
        client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return client


async def generate_trade_insight(trade_data: dict, user_tier: str = "FREE") -> str | None:
    """
    Generate AI coaching insight for a completed trade.

    trade_data: {symbol, side, entry_price, exit_price, pnl, pnl_percent,
                 duration_hours, qty, entry_time, exit_time}
    Returns 2-3 sentence coaching note, or None if not available.
    """
    if user_tier not in ("PRO", "ELITE", "PROP_CHALLENGE"):
        return None

    ai_client = get_anthropic_client()
    if not ai_client:
        return None

    try:
        symbol = trade_data.get("symbol", "Unknown")
        side = trade_data.get("side", "Unknown")
        entry_price = float(trade_data.get("entry_price", 0))
        exit_price = float(trade_data.get("exit_price", 0))
        pnl = float(trade_data.get("pnl", 0))
        pnl_percent = float(trade_data.get("pnl_percent", 0))
        duration_hours = float(trade_data.get("duration_hours", 0))
        qty = trade_data.get("qty", 0)

        prompt = f"""You are an expert crypto trading coach reviewing a student's trade.

Trade details:
- Asset: {symbol}
- Direction: {side}
- Entry: ${entry_price:.4f}
- Exit: ${exit_price:.4f}
- P&L: ${pnl:.2f} ({pnl_percent:.2f}%)
- Duration: {duration_hours:.1f} hours
- Size: {qty} units

Provide a concise 2-3 sentence coaching note covering: what was done well (or what went wrong), one specific improvement suggestion, and any relevant market pattern observation. Be direct and practical. No emojis."""

        message = await ai_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text
    except Exception as e:
        logger.warning(f"AI coaching generation failed: {e}")
        return None


async def store_trade_insight(
    trade_id: str, insight: str, model: str = "claude-sonnet-4-6"
):
    """Store AI insight in trade_insights table."""
    try:
        from app.core.database import async_session_maker
        from sqlalchemy import text

        async with async_session_maker() as session:
            await session.execute(
                text(
                    "INSERT INTO trade_insights (id, trade_id, insight_text, model, created_at) "
                    "VALUES (gen_random_uuid(), :trade_id, :insight, :model, now())"
                ),
                {"trade_id": str(trade_id), "insight": insight, "model": model},
            )
            await session.commit()
    except Exception as e:
        logger.warning(f"Failed to store trade insight: {e}")


async def generate_weekly_insight(username: str, trade_count: int, weekly_return: float) -> str | None:
    """Generate a 2-sentence weekly coaching note for the digest email."""
    ai_client = get_anthropic_client()
    if not ai_client:
        return None

    try:
        sign = "+" if weekly_return >= 0 else ""
        prompt = (
            f"You are an expert crypto trading coach writing a weekly summary note for a student.\n\n"
            f"Student: {username}\n"
            f"This week: {trade_count} trades executed, {sign}{weekly_return:.1f}% return.\n\n"
            f"Write exactly 2 sentences: one observation about their week (positive framing even if negative "
            f"return), and one actionable tip for next week. Be concise, direct, and encouraging. No emojis."
        )
        message = await ai_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=120,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text
    except Exception as e:
        logger.warning(f"Weekly insight generation failed: {e}")
        return None
