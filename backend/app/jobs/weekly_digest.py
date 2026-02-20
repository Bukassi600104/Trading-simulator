"""
Weekly Email Digest Job.

Generates AI-powered weekly performance summaries using Claude API
and sends them via Resend email service.
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from loguru import logger

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("DIGEST_FROM_EMAIL", "noreply@terminalzero.com")


async def generate_coaching_insight(stats: dict) -> str:
    """
    Use Claude to generate a personalized weekly coaching insight.
    """
    if not ANTHROPIC_API_KEY:
        return _fallback_insight(stats)

    try:
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

        prompt = f"""You are a professional crypto trading coach reviewing a student's weekly performance.

Weekly stats:
- Total trades: {stats.get('total_trades', 0)}
- Win rate: {stats.get('win_rate_pct', 0):.1f}%
- P&L: ${stats.get('total_pnl', 0):.2f}
- Best trade: {stats.get('best_trade_symbol', 'N/A')} (+${stats.get('best_trade_pnl', 0):.2f})
- Worst trade: {stats.get('worst_trade_symbol', 'N/A')} (-${abs(stats.get('worst_trade_pnl', 0)):.2f})
- Current streak: {stats.get('streak_days', 0)} days
- XP earned this week: {stats.get('xp_weekly', 0)}

Write a concise (3-4 sentences) personalized coaching insight. Be encouraging but honest.
Focus on one specific improvement suggestion based on their performance pattern.
End with a motivational closing sentence. Keep it under 100 words."""

        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text
    except Exception as e:
        logger.error(f"Claude coaching insight error: {e}")
        return _fallback_insight(stats)


def _fallback_insight(stats: dict) -> str:
    win_rate = stats.get("win_rate_pct", 0)
    pnl = stats.get("total_pnl", 0)

    if win_rate >= 60 and pnl > 0:
        return (
            "Strong week! Your win rate is above 60% — keep focusing on high-probability setups. "
            "Consider journaling your best trades to reinforce what's working."
        )
    elif pnl < 0:
        return (
            "Losses are part of the learning process. Review your losing trades to identify patterns. "
            "Focus on risk management — protecting capital is the #1 priority."
        )
    else:
        return (
            "Solid consistency this week. Keep building your edge through deliberate practice. "
            "Every trade is a learning opportunity."
        )


async def get_user_weekly_stats(user_id, session) -> dict:
    """Fetch weekly trading stats for a user from the database."""
    from sqlalchemy import func, select
    from app.models.portfolio import Order

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    try:
        result = await session.execute(
            select(Order)
            .where(Order.user_id == user_id)
            .where(Order.created_at >= week_ago)
            .where(Order.status == "FILLED")
        )
        orders = result.scalars().all()

        if not orders:
            return {"total_trades": 0}

        wins = [o for o in orders if float(o.realized_pnl or 0) > 0]
        win_rate = len(wins) / len(orders) * 100 if orders else 0
        total_pnl = sum(float(o.realized_pnl or 0) for o in orders)

        best = max(orders, key=lambda o: float(o.realized_pnl or 0), default=None)
        worst = min(orders, key=lambda o: float(o.realized_pnl or 0), default=None)

        return {
            "total_trades": len(orders),
            "win_rate_pct": round(win_rate, 1),
            "total_pnl": round(total_pnl, 2),
            "best_trade_symbol": best.symbol if best else "N/A",
            "best_trade_pnl": float(best.realized_pnl or 0) if best else 0,
            "worst_trade_symbol": worst.symbol if worst else "N/A",
            "worst_trade_pnl": float(worst.realized_pnl or 0) if worst else 0,
        }
    except Exception as e:
        logger.error(f"Weekly stats error for {user_id}: {e}")
        return {"total_trades": 0}


def _build_email_html(user_email: str, stats: dict, insight: str) -> str:
    """Build the weekly digest HTML email."""
    pnl = stats.get("total_pnl", 0)
    pnl_color = "#22c55e" if pnl >= 0 else "#ef4444"
    pnl_sign = "+" if pnl >= 0 else ""
    week_str = datetime.now(timezone.utc).strftime("%B %d, %Y")

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #07070f; color: #e2e8f0; margin: 0; padding: 0; }}
  .container {{ max-width: 600px; margin: 0 auto; padding: 32px 24px; }}
  .header {{ border-bottom: 1px solid #1a1a2e; padding-bottom: 20px; margin-bottom: 24px; }}
  .logo {{ color: #6366f1; font-size: 20px; font-weight: 700; }}
  .subtitle {{ color: #64748b; font-size: 13px; margin-top: 4px; }}
  .stat-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }}
  .stat-card {{ background: #0d0d1a; border: 1px solid #1a1a2e; border-radius: 12px; padding: 16px; }}
  .stat-label {{ color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }}
  .stat-value {{ font-size: 28px; font-weight: 700; margin-top: 4px; font-family: 'JetBrains Mono', monospace; }}
  .insight-box {{ background: #0d0d1a; border: 1px solid #6366f1; border-radius: 12px; padding: 20px; margin: 24px 0; }}
  .insight-title {{ color: #6366f1; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; }}
  .insight-text {{ color: #cbd5e1; font-size: 15px; line-height: 1.6; }}
  .cta {{ text-align: center; margin: 32px 0; }}
  .cta-btn {{ background: #6366f1; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; }}
  .footer {{ border-top: 1px solid #1a1a2e; padding-top: 20px; margin-top: 32px; color: #475569; font-size: 12px; text-align: center; }}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">Terminal Zero</div>
    <div class="subtitle">Your Weekly Performance Digest · {week_str}</div>
  </div>

  <p style="color: #94a3b8; margin-bottom: 8px;">Hey {user_email.split('@')[0]},</p>
  <p style="color: #94a3b8;">Here's your trading recap for the past week:</p>

  <div class="stat-grid">
    <div class="stat-card">
      <div class="stat-label">Weekly P&L</div>
      <div class="stat-value" style="color: {pnl_color}">{pnl_sign}${abs(pnl):.2f}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Win Rate</div>
      <div class="stat-value" style="color: #6366f1">{stats.get('win_rate_pct', 0):.0f}%</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Trades</div>
      <div class="stat-value" style="color: #e2e8f0">{stats.get('total_trades', 0)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Streak</div>
      <div class="stat-value" style="color: #f59e0b">{stats.get('streak_days', 0)}d 🔥</div>
    </div>
  </div>

  <div class="insight-box">
    <div class="insight-title">🤖 AI Coach Insight</div>
    <div class="insight-text">{insight}</div>
  </div>

  <div class="cta">
    <a href="https://terminalzero.com/dashboard" class="cta-btn">View Full Dashboard →</a>
  </div>

  <div class="footer">
    <p>Terminal Zero · Simulated environment, no real money involved</p>
    <p><a href="https://terminalzero.com/settings" style="color: #475569;">Unsubscribe from digest emails</a></p>
  </div>
</div>
</body>
</html>"""


async def send_weekly_digest(user_email: str, stats: dict) -> bool:
    """Send the weekly digest email to a user."""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — skipping weekly digest email")
        return False

    try:
        import resend

        resend.api_key = RESEND_API_KEY
        insight = await generate_coaching_insight(stats)
        html = _build_email_html(user_email, stats, insight)

        week_str = datetime.now(timezone.utc).strftime("%b %d")
        pnl = stats.get("total_pnl", 0)
        subject = (
            f"Weekly digest: +${pnl:.0f} this week 🎯"
            if pnl >= 0
            else f"Weekly digest: -${abs(pnl):.0f} — let's improve 📈"
        )

        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": user_email,
            "subject": subject,
            "html": html,
        })
        logger.info(f"Weekly digest sent to {user_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send weekly digest to {user_email}: {e}")
        return False


async def process_weekly_digests():
    """
    Process weekly digests for all active users.

    Called from scheduler on Monday morning ~08:00 UTC.
    """
    from sqlalchemy import select
    from app.core.database import async_session_maker
    from app.models.user import User

    logger.info("Starting weekly digest processing...")
    sent_count = 0
    error_count = 0

    async with async_session_maker() as session:
        result = await session.execute(
            select(User).where(User.is_active == True)
        )
        users = result.scalars().all()

        for user in users:
            try:
                stats = await get_user_weekly_stats(user.id, session)
                if stats.get("total_trades", 0) == 0:
                    continue  # Skip inactive users

                # Add streak data
                from app.models.gamification import Streak
                streak_r = await session.execute(
                    select(Streak).where(Streak.user_id == user.id)
                )
                streak = streak_r.scalar_one_or_none()
                stats["streak_days"] = streak.current_streak if streak else 0

                ok = await send_weekly_digest(user.email, stats)
                if ok:
                    sent_count += 1
            except Exception as e:
                logger.error(f"Weekly digest failed for {user.email}: {e}")
                error_count += 1

    logger.info(f"Weekly digests complete: {sent_count} sent, {error_count} errors")
