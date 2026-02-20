"""
Performance card sharing API.

Generates a PNG image card showing a user's trading performance
for sharing on social media.
"""
import io
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from loguru import logger
from sqlalchemy import select

from app.core.database import async_session_maker
from app.core.security import TokenData, get_current_user, get_user_id_from_token

router = APIRouter(prefix="/api/share", tags=["share"])


def _draw_card(
    username: str,
    return_pct: float,
    streak_days: int,
    top_asset: str,
    referral_code: Optional[str] = None,
) -> bytes:
    """Generate a 1200×630 Open Graph PNG performance card using Pillow."""
    from PIL import Image, ImageDraw, ImageFont

    W, H = 1200, 630
    BG = (7, 7, 20)          # #070714
    SURFACE = (13, 13, 26)   # #0d0d1a
    BORDER = (26, 26, 46)    # #1a1a2e
    INDIGO = (99, 102, 241)  # #6366f1
    GREEN = (34, 197, 94)    # #22c55e
    RED = (239, 68, 68)      # #ef4444
    WHITE = (248, 250, 252)
    GRAY = (100, 116, 139)
    AMBER = (251, 191, 36)

    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # --- Load fonts (system fallbacks) ---
    try:
        from PIL import ImageFont as IF
        font_xl = IF.truetype("arial.ttf", 80)
        font_lg = IF.truetype("arial.ttf", 48)
        font_md = IF.truetype("arial.ttf", 32)
        font_sm = IF.truetype("arial.ttf", 24)
        font_xs = IF.truetype("arial.ttf", 18)
    except Exception:
        font_xl = ImageFont.load_default()
        font_lg = font_xl
        font_md = font_xl
        font_sm = font_xl
        font_xs = font_xl

    # --- Card background panel ---
    draw.rounded_rectangle(
        [40, 40, W - 40, H - 40],
        radius=24,
        fill=SURFACE,
        outline=BORDER,
        width=2,
    )

    # --- Indigo top accent bar ---
    draw.rounded_rectangle([40, 40, W - 40, 46], radius=0, fill=INDIGO)

    # --- Logo ---
    draw.text((80, 80), "Terminal Zero", fill=INDIGO, font=font_md)
    draw.text((80, 122), "Ground Zero for Professional Trading", fill=GRAY, font=font_xs)

    # --- Divider ---
    draw.line([(80, 170), (W - 80, 170)], fill=BORDER, width=1)

    # --- Username ---
    draw.text((80, 195), f"@{username}", fill=GRAY, font=font_sm)

    # --- Return Percentage (big number) ---
    sign = "+" if return_pct >= 0 else ""
    ret_color = GREEN if return_pct >= 0 else RED
    ret_text = f"{sign}{return_pct:.1f}%"
    draw.text((80, 240), ret_text, fill=ret_color, font=font_xl)

    # --- Label under return ---
    draw.text((80, 340), "Total Return", fill=GRAY, font=font_sm)

    # --- Stats row ---
    stats_y = 420
    # Streak
    if streak_days > 0:
        draw.text((80, stats_y), "Streak", fill=GRAY, font=font_xs)
        draw.text((80, stats_y + 26), f"{streak_days} days", fill=AMBER, font=font_md)

    # Top asset
    asset_x = 350 if streak_days > 0 else 80
    draw.text((asset_x, stats_y), "Top Asset", fill=GRAY, font=font_xs)
    draw.text((asset_x, stats_y + 26), top_asset, fill=WHITE, font=font_md)

    # --- Referral / CTA ---
    ref_url = f"terminalzero.com/?ref={referral_code}" if referral_code else "terminalzero.com"
    draw.text((80, H - 100), "Beat me on →", fill=GRAY, font=font_sm)
    draw.text((80, H - 64), ref_url, fill=INDIGO, font=font_sm)

    # --- Simulated disclaimer ---
    disclaimer = "Simulated environment — no real money involved"
    draw.text((W - 80, H - 64), disclaimer, fill=(50, 60, 80), font=font_xs, anchor="rs")

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    buf.seek(0)
    return buf.read()


@router.get("/card/{user_id}.png")
async def get_performance_card(
    user_id: str,
    token_data: Optional[TokenData] = Depends(get_current_user),
):
    """
    Generate a shareable PNG performance card for the given user.

    Returns a 1200×630 PNG image suitable for Open Graph / Twitter cards.
    Public endpoint — user_id in the URL determines whose card to show.
    """
    try:
        target_uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    try:
        from app.models.user import User
        from app.models.gamification import Streak
        from app.api.portfolio import _get_portfolio_summary

        async with async_session_maker() as session:
            # Fetch user
            result = await session.execute(select(User).where(User.id == target_uid))
            user = result.scalar_one_or_none()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            username = user.email.split("@")[0]
            referral_code = getattr(user, "referral_code", None)

            # Fetch streak
            streak_days = 0
            streak_result = await session.execute(
                select(Streak).where(Streak.user_id == target_uid)
            )
            streak = streak_result.scalar_one_or_none()
            if streak:
                streak_days = streak.current_streak or 0

        # Try to get portfolio stats for return %
        return_pct = 0.0
        top_asset = "BTC-USDT"
        try:
            from app.api.portfolio import _get_portfolio_stats
            stats = await _get_portfolio_stats(target_uid)
            return_pct = float(stats.get("total_return_pct", 0))
            top_asset = stats.get("most_traded_pair", "BTC-USDT") or "BTC-USDT"
        except Exception:
            pass

        png_bytes = _draw_card(
            username=username,
            return_pct=return_pct,
            streak_days=streak_days,
            top_asset=top_asset,
            referral_code=referral_code,
        )

        return StreamingResponse(
            io.BytesIO(png_bytes),
            media_type="image/png",
            headers={
                "Cache-Control": "public, max-age=300",
                "Content-Disposition": f'inline; filename="tz-{username}.png"',
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Share card generation failed for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate share card")


@router.get("/me.png")
async def get_my_performance_card(
    token_data: TokenData = Depends(get_current_user),
):
    """Generate a share card for the currently authenticated user."""
    if token_data is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    user_id = str(get_user_id_from_token(token_data))
    return await get_performance_card(user_id, token_data)
