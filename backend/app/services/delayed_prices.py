"""15-minute delayed price feed using CoinGecko free tier API."""
import json
from datetime import datetime, timezone

import httpx
from loguru import logger

try:
    import redis.asyncio as aioredis
    _REDIS_AVAILABLE = True
except ImportError:
    aioredis = None
    _REDIS_AVAILABLE = False

from app.core.config import REDIS_URL

COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price"
COINGECKO_IDS = "bitcoin,ethereum,solana,binancecoin,ripple,dogecoin"
SYMBOL_MAP = {
    "bitcoin": "BTC-USDT",
    "ethereum": "ETH-USDT",
    "solana": "SOL-USDT",
    "binancecoin": "BNB-USDT",
    "ripple": "XRP-USDT",
    "dogecoin": "DOGE-USDT",
}
CACHE_KEY = "delayed_prices"
CACHE_TTL = 900  # 15 minutes


async def refresh_delayed_prices() -> dict:
    """Fetch from CoinGecko and cache in Redis. Returns price dict."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                COINGECKO_URL,
                params={
                    "ids": COINGECKO_IDS,
                    "vs_currencies": "usd",
                    "include_24hr_change": "true",
                    "include_last_updated_at": "true",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        prices = {}
        for cg_id, symbol in SYMBOL_MAP.items():
            if cg_id in data:
                prices[symbol] = {
                    "price": data[cg_id].get("usd", 0),
                    "change_24h": data[cg_id].get("usd_24h_change", 0),
                    "last_updated": data[cg_id].get("last_updated_at", 0),
                }

        cached_at = datetime.now(timezone.utc).isoformat()
        payload = {"prices": prices, "cached_at": cached_at}

        if _REDIS_AVAILABLE:
            try:
                r = aioredis.from_url(REDIS_URL, decode_responses=True)
                await r.setex(CACHE_KEY, CACHE_TTL, json.dumps(payload))
                await r.aclose()
            except Exception as e:
                logger.warning(f"Redis cache failed for delayed prices: {e}")

        return payload

    except Exception as e:
        logger.warning(f"CoinGecko price fetch failed: {e}")
        return {}


async def get_delayed_prices() -> dict:
    """Get delayed prices from Redis cache or fetch fresh."""
    if _REDIS_AVAILABLE:
        try:
            r = aioredis.from_url(REDIS_URL, decode_responses=True)
            cached = await r.get(CACHE_KEY)
            await r.aclose()
            if cached:
                return json.loads(cached)
        except Exception:
            pass
    # Cache miss: fetch fresh
    return await refresh_delayed_prices()
