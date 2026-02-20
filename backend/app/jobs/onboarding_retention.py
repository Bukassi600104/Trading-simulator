"""
Day 1 Onboarding Retention Email Jobs
Triggered after user registration to drive activation and retention.

Jobs:
- run_one_hour_retention_check:     fires ~1hr after sign-up (clan invite) if no clan joined
- run_twenty_four_hour_retention_check: fires ~24hr after sign-up (daily trading report)
"""

import asyncio
from datetime import datetime, timedelta, timezone

from loguru import logger
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.email_service import _send, _html_wrapper


# ---------------------------------------------------------------------------
# Email senders
# ---------------------------------------------------------------------------

async def send_clan_invite_email(user_email: str, username: str) -> None:
    """1-hour retention: 'Join a Clan' email if user has no clan."""
    html = _html_wrapper(f"""
<h2 style="color:#f8fafc;margin-bottom:8px">Trading is lonely. Join a Clan 🤝</h2>
<p style="color:#94a3b8;line-height:1.6">
  Hey <strong style="color:#f8fafc">{username}</strong>! You signed up an hour ago — great start.
  But the traders who improve fastest don't do it alone.
</p>
<p style="color:#94a3b8;line-height:1.6;margin-top:12px">
  Join <strong style="color:#00d4aa">The Bitcoin Bulls</strong> clan to compete on the live leaderboard,
  share trade setups, and track your rank against other traders worldwide.
</p>
<a href="https://terminalzero.com/community"
   style="display:inline-block;background:linear-gradient(135deg,#00d4aa,#00a085);
          color:#0a0d14;font-weight:700;padding:14px 36px;border-radius:10px;
          text-decoration:none;font-size:15px;margin-top:20px">
  Browse Clans &rarr;
</a>
""")
    try:
        await _send(user_email, "Trading is lonely — join a clan and compete! 🏆", html)
        logger.info(f"Clan invite email sent to {user_email}")
    except Exception as e:
        logger.error(f"Failed to send clan invite email to {user_email}: {e}")


async def send_daily_trading_report_email(
    user_email: str,
    username: str,
    total_trades: int,
    win_rate: float,
    total_pnl: float,
) -> None:
    """24-hour retention: daily trading report summary email."""
    pnl_color = "#10b981" if total_pnl >= 0 else "#ef4444"
    pnl_sign = "+" if total_pnl >= 0 else ""
    win_rate_pct = round(win_rate * 100, 1)

    html = _html_wrapper(f"""
<h2 style="color:#f8fafc;margin-bottom:4px">Your Day 1 Report is here! 📊</h2>
<p style="color:#94a3b8;margin-bottom:24px">Here's how your first day of trading went, <strong style="color:#f8fafc">{username}</strong>.</p>

<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:12px">
  <tr>
    <td style="background:#1e293b;border-radius:12px;padding:20px;text-align:center;width:33%">
      <div style="font-size:30px;font-weight:700;color:#f8fafc">{total_trades}</div>
      <div style="color:#64748b;font-size:13px;margin-top:4px">Trades Made</div>
    </td>
    <td style="background:#1e293b;border-radius:12px;padding:20px;text-align:center;width:33%">
      <div style="font-size:30px;font-weight:700;color:#3b82f6">{win_rate_pct}%</div>
      <div style="color:#64748b;font-size:13px;margin-top:4px">Win Rate</div>
    </td>
    <td style="background:#1e293b;border-radius:12px;padding:20px;text-align:center;width:33%">
      <div style="font-size:30px;font-weight:700;color:{pnl_color}">{pnl_sign}${abs(total_pnl):.2f}</div>
      <div style="color:#64748b;font-size:13px;margin-top:4px">Total PnL</div>
    </td>
  </tr>
</table>

<p style="color:#94a3b8;line-height:1.6;margin-top:24px">
  Every trade is automatically logged in your
  <strong style="color:#f8fafc">Trading Journal</strong>.
  Review your setups, emotions, and patterns to improve faster.
</p>
<a href="https://terminalzero.com/journal"
   style="display:inline-block;background:linear-gradient(135deg,#00d4aa,#00a085);
          color:#0a0d14;font-weight:700;padding:14px 36px;border-radius:10px;
          text-decoration:none;font-size:15px;margin-top:20px">
  View My Journal &rarr;
</a>
""")
    try:
        await _send(
            user_email,
            f"Your Day 1 Trading Report — {win_rate_pct}% win rate 📈",
            html,
        )
        logger.info(f"Daily trading report sent to {user_email}")
    except Exception as e:
        logger.error(f"Failed to send daily report to {user_email}: {e}")


# ---------------------------------------------------------------------------
# Scheduled checks (called from scheduler_loop in main.py)
# ---------------------------------------------------------------------------

async def run_one_hour_retention_check(db: AsyncSession) -> None:
    """
    Identify users who registered ~1 hour ago and haven't joined a clan.
    Runs every 5 minutes to catch users in the ±5-minute scheduling window.
    """
    now = datetime.now(timezone.utc)
    one_hour_ago = now - timedelta(hours=1)
    window_start = one_hour_ago - timedelta(minutes=5)

    result = await db.execute(
        select(User).where(
            and_(
                User.created_at >= window_start,
                User.created_at <= one_hour_ago,
                User.clan_id.is_(None),
                User.is_active == True,  # noqa: E712
            )
        )
    )
    users = result.scalars().all()
    logger.info(f"[Retention 1hr] {len(users)} users eligible for clan invite")

    for user in users:
        name = user.username or user.email.split("@")[0]
        asyncio.create_task(send_clan_invite_email(user.email, name))


async def run_twenty_four_hour_retention_check(db: AsyncSession) -> None:
    """
    Identify users who registered ~24 hours ago.
    Sends a daily trading report if they made at least one trade.
    """
    now = datetime.now(timezone.utc)
    twenty_four_hours_ago = now - timedelta(hours=24)
    window_start = twenty_four_hours_ago - timedelta(minutes=5)

    result = await db.execute(
        select(User).where(
            and_(
                User.created_at >= window_start,
                User.created_at <= twenty_four_hours_ago,
                User.is_active == True,  # noqa: E712
            )
        )
    )
    users = result.scalars().all()
    logger.info(f"[Retention 24hr] {len(users)} users to process")

    for user in users:
        try:
            from app.models.order import Order

            orders_result = await db.execute(
                select(Order).where(Order.user_id == user.id)
            )
            orders = orders_result.scalars().all()

            if not orders:
                continue  # No trades — skip this user

            total_trades = len(orders)
            winning = sum(
                1 for o in orders
                if hasattr(o, "pnl") and o.pnl is not None and o.pnl > 0
            )
            win_rate = winning / total_trades if total_trades > 0 else 0.0
            total_pnl = sum(
                (o.pnl or 0) for o in orders if hasattr(o, "pnl")
            )

            name = user.username or user.email.split("@")[0]
            asyncio.create_task(
                send_daily_trading_report_email(
                    user.email, name, total_trades, win_rate, float(total_pnl)
                )
            )
        except Exception as e:
            logger.error(f"Error building daily report for {user.email}: {e}")
