"""Email service using Resend API. Falls back to console logging in dev mode."""
import os
from loguru import logger

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "Terminal Zero <noreply@terminalzero.com>")

try:
    import resend
    resend.api_key = RESEND_API_KEY
    _RESEND_AVAILABLE = bool(RESEND_API_KEY)
except ImportError:
    _RESEND_AVAILABLE = False

def _html_wrapper(content: str) -> str:
    return f"""<!DOCTYPE html><html><body style="background:#070714;color:#e2e8f0;font-family:Inter,sans-serif;padding:40px;max-width:600px;margin:0 auto">
<div style="border:1px solid #1a1a2e;border-radius:12px;padding:32px">
<div style="font-family:monospace;font-size:20px;font-weight:bold;color:#6366f1;margin-bottom:24px">Terminal Zero</div>
{content}
<hr style="border:1px solid #1a1a2e;margin:24px 0">
<p style="font-size:12px;color:#64748b">Ground Zero for Professional Trading. This is a simulated trading environment — no real money involved.</p>
</div></body></html>"""

async def _send(to_email: str, subject: str, html: str) -> bool:
    if not _RESEND_AVAILABLE:
        logger.info(f"[EMAIL DEV] To: {to_email} | Subject: {subject}")
        return True
    try:
        import resend as r
        r.Emails.send({"from": FROM_EMAIL, "to": [to_email], "subject": subject, "html": html})
        return True
    except Exception as e:
        logger.warning(f"Email send failed to {to_email}: {e}")
        return False

async def send_welcome_email(to_email: str, username: str) -> bool:
    html = _html_wrapper(f"""
<h2 style="color:#f8fafc;margin-bottom:8px">Welcome to Terminal Zero, {username}!</h2>
<p style="color:#94a3b8">Your 14-day Pro trial is now active. Here's how to get started:</p>
<ol style="color:#94a3b8;line-height:2">
<li>Open the <a href="https://terminalzero.com/trade" style="color:#6366f1">Trade page</a> and execute your first trade</li>
<li>Watch your portfolio update in real-time</li>
<li>Check your <a href="https://terminalzero.com/dashboard" style="color:#6366f1">Dashboard</a> for stats</li>
</ol>
<p style="color:#94a3b8">Your Pro trial includes: real-time data, AI coaching, backtesting, and advanced analytics.</p>
<a href="https://terminalzero.com/trade" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Start Trading &rarr;</a>""")
    return await _send(to_email, "Welcome to Terminal Zero \u2014 Your 14-day Pro trial is active", html)

async def send_trial_halfway_email(to_email: str, username: str, days_left: int) -> bool:
    html = _html_wrapper(f"""
<h2 style="color:#f8fafc">You're halfway through your Pro trial, {username}</h2>
<p style="color:#94a3b8">You have <strong style="color:#f59e0b">{days_left} days left</strong> of your Pro trial.</p>
<p style="color:#94a3b8">Pro features you can use right now:</p>
<ul style="color:#94a3b8;line-height:2"><li>Real-time market data</li><li>AI trade coaching after every trade</li><li>Backtesting your strategies</li><li>Advanced portfolio analytics (Sharpe ratio, drawdown)</li></ul>
<a href="https://terminalzero.com/pricing" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Upgrade to Pro &mdash; $9.99/mo &rarr;</a>""")
    return await _send(to_email, f"Your Pro trial ends in {days_left} days \u2014 Upgrade to keep access", html)

async def send_trial_expiring_email(to_email: str, username: str) -> bool:
    html = _html_wrapper(f"""
<h2 style="color:#f8fafc">2 days left on your Pro trial, {username}</h2>
<p style="color:#94a3b8">Your Pro trial expires in 2 days. After that, you'll lose access to:</p>
<ul style="color:#94a3b8;line-height:2"><li>Real-time market data (reverts to 15-min delay)</li><li>AI trade coaching</li><li>Backtesting</li><li>Advanced analytics</li></ul>
<a href="https://terminalzero.com/pricing" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Upgrade Now &mdash; $9.99/mo &rarr;</a>""")
    return await _send(to_email, "2 days left \u2014 Upgrade to keep your Pro features", html)

async def send_trial_expired_email(to_email: str, username: str) -> bool:
    html = _html_wrapper(f"""
<h2 style="color:#f8fafc">Your Pro trial has ended, {username}</h2>
<p style="color:#94a3b8">Your free trial has expired. You've been moved to the Free plan.</p>
<p style="color:#94a3b8">Upgrade to Pro to restore all your features and keep building your trading skills.</p>
<a href="https://terminalzero.com/pricing" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Upgrade to Pro &mdash; $9.99/mo &rarr;</a>""")
    return await _send(to_email, "Your Pro trial has ended \u2014 Upgrade to continue", html)

async def send_password_reset_email(to_email: str, reset_link: str) -> bool:
    html = _html_wrapper(f"""
<h2 style="color:#f8fafc">Reset your password</h2>
<p style="color:#94a3b8">Click the button below to reset your Terminal Zero password. This link expires in 15 minutes.</p>
<a href="{reset_link}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Reset Password &rarr;</a>
<p style="color:#64748b;font-size:12px;margin-top:16px">If you didn't request this, ignore this email.</p>""")
    return await _send(to_email, "Reset your Terminal Zero password", html)
