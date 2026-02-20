"""
African Market API endpoints.

Provides NGN-denominated prices, Naira devaluation simulator,
and low-data mode for users with limited bandwidth.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.african_market import (
    calculate_naira_inflation_impact,
    get_compact_prices,
    get_naira_devaluation_history,
    get_ngn_prices,
    get_usd_ngn_rate,
)
from app.services.delayed_prices import get_delayed_prices

router = APIRouter(prefix="/api/african-market", tags=["african-market"])


class InflationSimRequest(BaseModel):
    amount_ngn: float
    entry_year: int
    exit_year: int


@router.get("/rate")
async def get_exchange_rate():
    """Get current USD/NGN exchange rate (cached 15 min)."""
    rate = await get_usd_ngn_rate()
    return {"usd_ngn": float(rate), "currency": "NGN"}


@router.get("/prices/ngn")
async def get_ngn_crypto_prices():
    """
    Get crypto prices denominated in NGN.

    Fetches current USD prices from the market data cache
    and converts them to Naira.
    """
    try:
        data = await get_delayed_prices()
        raw = data.get("prices", {})
        prices_usd = {sym: info["price"] for sym, info in raw.items() if "price" in info}
    except Exception:
        prices_usd = {
            "BTC-USDT": 50000.0,
            "ETH-USDT": 3000.0,
            "SOL-USDT": 150.0,
            "BNB-USDT": 600.0,
            "XRP-USDT": 0.65,
            "DOGE-USDT": 0.12,
        }

    ngn_prices = await get_ngn_prices(prices_usd)
    rate = await get_usd_ngn_rate()

    return {
        "prices_ngn": ngn_prices,
        "prices_usd": prices_usd,
        "usd_ngn_rate": float(rate),
    }


@router.get("/prices/compact")
async def get_compact_price_feed():
    """
    Ultra-compact price feed for low-data / metered connections.

    Returns minimal JSON: [[symbol, price], ...]
    """
    try:
        data = await get_delayed_prices()
        raw = data.get("prices", {})
        prices_usd = {sym: info["price"] for sym, info in raw.items() if "price" in info}
    except Exception:
        prices_usd = {}

    compact = get_compact_prices(prices_usd)
    rate = float(await get_usd_ngn_rate())
    return {"p": compact, "r": rate}  # ultra-short keys


@router.get("/devaluation/history")
async def get_devaluation_history():
    """Get historical NGN devaluation milestones for the simulator."""
    return {"history": get_naira_devaluation_history()}


@router.post("/devaluation/simulate")
async def simulate_devaluation(body: InflationSimRequest):
    """
    Simulate purchasing power loss due to Naira devaluation.

    Shows what ₦X in year Y is worth today and how BTC would have
    preserved value by comparison.
    """
    if body.entry_year >= body.exit_year:
        raise HTTPException(
            status_code=400, detail="exit_year must be after entry_year"
        )
    if body.amount_ngn <= 0:
        raise HTTPException(status_code=400, detail="amount_ngn must be positive")

    result = calculate_naira_inflation_impact(
        body.amount_ngn, body.entry_year, body.exit_year
    )

    # Add BTC comparison: if they had bought BTC instead
    # BTC in 2015 ~$200, today ~$50,000
    btc_prices = {
        2015: 200, 2016: 700, 2017: 14000, 2018: 3500, 2019: 7200,
        2020: 29000, 2021: 47000, 2022: 16000, 2023: 42000, 2024: 67000,
        2025: 75000,
    }
    btc_entry = btc_prices.get(body.entry_year, 10000)
    btc_exit = btc_prices.get(body.exit_year, 50000)
    btc_return_pct = (btc_exit - btc_entry) / btc_entry * 100

    result["btc_comparison"] = {
        "btc_price_entry_usd": btc_entry,
        "btc_price_exit_usd": btc_exit,
        "btc_return_pct": round(btc_return_pct, 1),
    }

    return result
