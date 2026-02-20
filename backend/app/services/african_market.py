"""
African Market Service.

Provides:
- NGN/USD exchange rate fetching and caching (via free API)
- BTC/NGN price conversion
- Naira devaluation historical simulation data
- Low-data mode price snapshots (compact format)
"""
import asyncio
import time
from decimal import Decimal
from typing import Dict, Optional

import httpx
from loguru import logger

# Cache structure: {key: (value, fetched_at)}
_rate_cache: Dict[str, tuple] = {}
CACHE_TTL = 900  # 15 minutes


async def get_usd_ngn_rate() -> Decimal:
    """
    Fetch current USD/NGN exchange rate.

    Uses free ExchangeRate API with 15-minute cache.
    Falls back to last known rate on error.
    """
    cache_key = "USD_NGN"
    cached = _rate_cache.get(cache_key)
    if cached and time.time() - cached[1] < CACHE_TTL:
        return cached[0]

    # Try multiple sources
    rate = None
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            # ExchangeRate-API free tier
            resp = await client.get(
                "https://open.er-api.com/v6/latest/USD"
            )
            data = resp.json()
            if data.get("result") == "success":
                ngn_rate = data["rates"].get("NGN")
                if ngn_rate:
                    rate = Decimal(str(ngn_rate))
    except Exception as e:
        logger.warning(f"Exchange rate fetch failed: {e}")

    if rate is None:
        # Fallback: use last cached or hardcoded fallback
        if cached:
            return cached[0]
        rate = Decimal("1580.00")  # approximate 2025 rate

    _rate_cache[cache_key] = (rate, time.time())
    return rate


async def get_btc_ngn_price(btc_usd_price: float) -> dict:
    """Convert BTC/USD price to NGN."""
    ngn_rate = await get_usd_ngn_rate()
    btc_ngn = Decimal(str(btc_usd_price)) * ngn_rate
    return {
        "btc_usd": btc_usd_price,
        "btc_ngn": float(btc_ngn),
        "usd_ngn_rate": float(ngn_rate),
    }


async def get_ngn_prices(prices_usd: Dict[str, float]) -> Dict[str, float]:
    """
    Convert a dict of USD prices to NGN.

    E.g. {"BTC-USDT": 50000, "ETH-USDT": 3000} → {"BTC-NGN": ..., "ETH-NGN": ...}
    """
    ngn_rate = await get_usd_ngn_rate()
    result = {}
    for symbol, usd_price in prices_usd.items():
        base = symbol.split("-")[0]
        result[f"{base}-NGN"] = round(float(Decimal(str(usd_price)) * ngn_rate), 2)
    return result


def get_naira_devaluation_history() -> list:
    """
    Return historical USD/NGN exchange rate milestones for the
    Naira devaluation simulator.

    Data is approximate historical rates (not live).
    """
    return [
        {"year": 2015, "rate": 197.0, "event": "CBN devaluation after oil price crash"},
        {"year": 2016, "rate": 305.0, "event": "Naira float policy introduced"},
        {"year": 2017, "rate": 360.0, "event": "Parallel market premium narrows"},
        {"year": 2018, "rate": 362.0, "event": "Relative stability period"},
        {"year": 2019, "rate": 365.0, "event": "CBN rate peg maintained"},
        {"year": 2020, "rate": 410.0, "event": "COVID-19 oil demand shock"},
        {"year": 2021, "rate": 415.0, "event": "FX scarcity deepens"},
        {"year": 2022, "rate": 460.0, "event": "Multiple devaluations"},
        {"year": 2023, "rate": 900.0, "event": "Tinubu FX liberalisation"},
        {"year": 2024, "rate": 1580.0, "event": "Continued depreciation"},
        {"year": 2025, "rate": 1620.0, "event": "Stabilisation attempts"},
    ]


def calculate_naira_inflation_impact(
    amount_ngn: float,
    entry_year: int,
    exit_year: int,
) -> dict:
    """
    Calculate how much purchasing power has been lost due to Naira devaluation.

    Shows equivalent BTC position in USD terms vs NGN terms.
    """
    history = {item["year"]: item["rate"] for item in get_naira_devaluation_history()}

    entry_rate = history.get(entry_year, 400.0)
    exit_rate = history.get(exit_year, 1580.0)

    amount_usd_at_entry = amount_ngn / entry_rate
    amount_ngn_equivalent_today = amount_usd_at_entry * exit_rate
    depreciation_pct = (exit_rate - entry_rate) / entry_rate * 100

    return {
        "amount_ngn_original": amount_ngn,
        "entry_year": entry_year,
        "entry_rate": entry_rate,
        "exit_year": exit_year,
        "exit_rate": exit_rate,
        "amount_usd": round(amount_usd_at_entry, 2),
        "amount_ngn_today": round(amount_ngn_equivalent_today, 2),
        "depreciation_pct": round(depreciation_pct, 1),
        "purchasing_power_loss_pct": round(
            (1 - amount_ngn / amount_ngn_equivalent_today) * 100, 1
        ),
    }


def get_compact_prices(prices_usd: Dict[str, float]) -> list:
    """
    Return prices in ultra-compact format for low-data mode.

    Each entry: [symbol_short, usd_price, change_24h_pct]
    """
    symbol_short = {
        "BTC-USDT": "BTC",
        "ETH-USDT": "ETH",
        "SOL-USDT": "SOL",
        "BNB-USDT": "BNB",
        "XRP-USDT": "XRP",
        "DOGE-USDT": "DOGE",
    }
    return [
        [symbol_short.get(sym, sym), round(price, 2)]
        for sym, price in prices_usd.items()
    ]
