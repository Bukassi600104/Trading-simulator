"""Public market data endpoints."""
from fastapi import APIRouter

from app.services.delayed_prices import get_delayed_prices

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/delayed-prices")
async def delayed_prices():
    """Returns 15-minute delayed prices for free-tier users. Public endpoint."""
    data = await get_delayed_prices()
    if not data:
        return {
            "prices": {},
            "delayed_by_minutes": 15,
            "cached_at": None,
            "error": "Price data temporarily unavailable",
        }
    return {
        "prices": data.get("prices", {}),
        "delayed_by_minutes": 15,
        "cached_at": data.get("cached_at"),
    }
