"""
Market Stream Service
Connects to Bybit WebSocket and streams real-time price data.

Features:
- Exponential backoff reconnection with jitter
- Multi-symbol support (BTC, ETH, SOL, BNB, XRP, DOGE)
- Data buffering and replay on reconnect
- Redis caching for historical klines
"""

import asyncio
import json
import os
import random
from collections import deque
from datetime import datetime
from decimal import Decimal
from typing import Deque, Dict, Optional, Set

import httpx
import websockets
from loguru import logger

from app.core.config import BYBIT_SYMBOLS, REDIS_URL

# Try to import redis; gracefully degrade if unavailable
try:
    import redis.asyncio as aioredis

    _REDIS_AVAILABLE = True
except ImportError:
    aioredis = None  # type: ignore[assignment]
    _REDIS_AVAILABLE = False


class MarketStreamService:
    """
    Service that connects to Bybit USDT Perpetual WebSocket
    and distributes price updates to subscribed clients.
    """

    BYBIT_WS_URL = "wss://stream.bybit.com/v5/public/linear"
    BYBIT_REST_URL = "https://api.bybit.com"

    # Reconnection parameters
    RECONNECT_BASE_DELAY = 1.0  # seconds
    RECONNECT_MAX_DELAY = 60.0  # seconds
    RECONNECT_JITTER = 0.5  # fraction of delay to add as jitter

    # Data buffer size (per symbol, keeps last N ticks for replay)
    BUFFER_SIZE = 100

    # Redis cache TTL for klines (seconds)
    KLINE_CACHE_TTL = 300  # 5 minutes

    # Supported timeframes mapping to Bybit intervals
    TIMEFRAMES = {
        "1": "1",
        "3": "3",
        "5": "5",
        "15": "15",
        "30": "30",
        "60": "60",
        "120": "120",
        "240": "240",
        "D": "D",
        "W": "W",
    }

    def __init__(self):
        self.running = False
        self.ws = None
        # Map of "symbol:interval" -> set of client queues
        self.subscribers: Dict[str, Set[asyncio.Queue]] = {}
        # Current candle data per symbol:interval
        self.current_candles: Dict[str, dict] = {}
        # ATH/ATL data per symbol
        self.ath_atl_data: Dict[str, dict] = {}
        # Active subscriptions to Bybit
        self.active_bybit_subs: Set[str] = set()
        # Reconnection state
        self._reconnect_attempt = 0
        # Data buffer for replay on reconnect (per symbol)
        self._tick_buffer: Dict[str, Deque[dict]] = {
            s: deque(maxlen=self.BUFFER_SIZE) for s in BYBIT_SYMBOLS
        }
        # Connection health
        self._last_message_time: Optional[datetime] = None
        self._connected = False
        # Redis client (lazy init)
        self._redis: Optional[object] = None

    # ------------------------------------------------------------------
    # Redis helpers
    # ------------------------------------------------------------------

    async def _get_redis(self):
        """Lazy-initialize Redis connection."""
        if not _REDIS_AVAILABLE:
            return None
        if self._redis is None:
            try:
                self._redis = aioredis.from_url(
                    REDIS_URL, decode_responses=True
                )
                await self._redis.ping()
                logger.info("Redis connected for kline caching")
            except Exception as e:
                logger.warning(f"Redis unavailable, caching disabled: {e}")
                self._redis = None
        return self._redis

    async def _cache_klines(self, cache_key: str, data: list) -> None:
        """Store klines in Redis with TTL."""
        r = await self._get_redis()
        if r is None:
            return
        try:
            await r.setex(cache_key, self.KLINE_CACHE_TTL, json.dumps(data))
        except Exception as e:
            logger.debug(f"Redis cache write failed: {e}")

    async def _get_cached_klines(self, cache_key: str) -> Optional[list]:
        """Retrieve klines from Redis cache."""
        r = await self._get_redis()
        if r is None:
            return None
        try:
            raw = await r.get(cache_key)
            if raw:
                return json.loads(raw)
        except Exception as e:
            logger.debug(f"Redis cache read failed: {e}")
        return None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def start(self):
        """Start the market stream connection with exponential backoff."""
        self.running = True

        # Fetch initial ATH/ATL data for all symbols
        for sym in BYBIT_SYMBOLS:
            await self._fetch_ath_atl(sym)

        while self.running:
            try:
                await self._connect()
            except Exception as e:
                logger.error(f"Connection error: {e}")
                if self.running:
                    delay = self._backoff_delay()
                    logger.info(
                        f"Reconnecting in {delay:.1f}s "
                        f"(attempt {self._reconnect_attempt})..."
                    )
                    await asyncio.sleep(delay)

    def _backoff_delay(self) -> float:
        """Calculate exponential backoff delay with jitter."""
        self._reconnect_attempt += 1
        base = min(
            self.RECONNECT_BASE_DELAY * (2 ** (self._reconnect_attempt - 1)),
            self.RECONNECT_MAX_DELAY,
        )
        jitter = base * self.RECONNECT_JITTER * random.random()
        return base + jitter

    async def _fetch_ath_atl(self, symbol: str):
        """Fetch All-Time High and All-Time Low from Bybit REST API."""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.BYBIT_REST_URL}/v5/market/kline"
                params = {
                    "category": "linear",
                    "symbol": symbol,
                    "interval": "W",
                    "limit": 200,
                }
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("retCode") == 0:
                        klines = data.get("result", {}).get("list", [])
                        if klines:
                            highs = [float(k[2]) for k in klines]
                            lows = [float(k[3]) for k in klines]
                            self.ath_atl_data[symbol] = {
                                "ath": max(highs),
                                "atl": min(lows),
                                "updated": datetime.now().isoformat(),
                            }
                            logger.info(
                                f"{symbol} ATH: ${max(highs):,.2f}, "
                                f"ATL: ${min(lows):,.2f}"
                            )
        except Exception as e:
            logger.error(f"Error fetching ATH/ATL for {symbol}: {e}")

    # ------------------------------------------------------------------
    # Historical klines (with Redis cache)
    # ------------------------------------------------------------------

    async def get_historical_klines(
        self, symbol: str, interval: str = "1", limit: int = 200
    ):
        """Fetch historical klines with Redis cache fallback."""
        cache_key = f"klines:{symbol}:{interval}:{limit}"

        # Try cache first
        cached = await self._get_cached_klines(cache_key)
        if cached:
            logger.debug(f"Cache hit for {cache_key}")
            return cached

        # Fall back to API
        candles = await self._fetch_klines_from_api(symbol, interval, limit)

        # Cache the result
        if candles:
            await self._cache_klines(cache_key, candles)

        return candles

    async def _fetch_klines_from_api(
        self, symbol: str, interval: str, limit: int
    ) -> list:
        """Fetch klines directly from Bybit REST API."""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.BYBIT_REST_URL}/v5/market/kline"
                params = {
                    "category": "linear",
                    "symbol": symbol,
                    "interval": interval,
                    "limit": min(limit, 200),
                }
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("retCode") == 0:
                        klines = data.get("result", {}).get("list", [])
                        candles = []
                        for k in reversed(klines):
                            candles.append(
                                {
                                    "time": int(k[0]) // 1000,
                                    "open": float(k[1]),
                                    "high": float(k[2]),
                                    "low": float(k[3]),
                                    "close": float(k[4]),
                                    "volume": float(k[5]),
                                }
                            )
                        return candles
        except Exception as e:
            logger.error(f"Error fetching historical klines: {e}")
        return []

    async def get_extended_historical_klines(
        self, symbol: str, interval: str = "1", limit: int = 1000
    ):
        """
        Fetch extended historical klines via multiple paginated requests.
        Results are cached in Redis per page.
        """
        cache_key = f"klines_ext:{symbol}:{interval}:{limit}"
        cached = await self._get_cached_klines(cache_key)
        if cached:
            return cached

        all_candles = []
        remaining = limit
        end_time = None

        try:
            async with httpx.AsyncClient() as client:
                while remaining > 0:
                    batch_limit = min(remaining, 200)
                    url = f"{self.BYBIT_REST_URL}/v5/market/kline"
                    params = {
                        "category": "linear",
                        "symbol": symbol,
                        "interval": interval,
                        "limit": batch_limit,
                    }
                    if end_time:
                        params["end"] = end_time

                    response = await client.get(url, params=params)
                    if response.status_code != 200:
                        break

                    data = response.json()
                    if data.get("retCode") != 0:
                        break

                    klines = data.get("result", {}).get("list", [])
                    if not klines:
                        break

                    batch_candles = []
                    for k in klines:
                        batch_candles.append(
                            {
                                "time": int(k[0]) // 1000,
                                "open": float(k[1]),
                                "high": float(k[2]),
                                "low": float(k[3]),
                                "close": float(k[4]),
                                "volume": float(k[5]),
                            }
                        )

                    all_candles = batch_candles + all_candles
                    oldest_candle_time = int(klines[-1][0])
                    end_time = oldest_candle_time - 1
                    remaining -= len(klines)

                    if remaining > 0:
                        await asyncio.sleep(0.1)

        except Exception as e:
            logger.error(f"Error fetching extended historical klines: {e}")

        all_candles.sort(key=lambda x: x["time"])

        if all_candles:
            await self._cache_klines(cache_key, all_candles)

        return all_candles

    # ------------------------------------------------------------------
    # WebSocket connection
    # ------------------------------------------------------------------

    async def _connect(self):
        """Establish WebSocket connection to Bybit with reconnection handling."""
        logger.info("Connecting to Bybit WebSocket...")

        async with websockets.connect(
            self.BYBIT_WS_URL,
            ping_interval=20,
            ping_timeout=10,
            close_timeout=5,
        ) as ws:
            self.ws = ws
            self._connected = True
            self._reconnect_attempt = 0  # Reset on successful connect
            self._last_message_time = datetime.utcnow()
            logger.info("Connected to Bybit WebSocket")

            # Subscribe to all supported symbols with 1-minute interval
            for sym in BYBIT_SYMBOLS:
                await self._subscribe_to_bybit(sym, "1")

            # Re-subscribe any active client subscriptions
            for sub_key in list(self.active_bybit_subs):
                parts = sub_key.split(".")
                if len(parts) >= 3:
                    subscribe_msg = {"op": "subscribe", "args": [sub_key]}
                    await ws.send(json.dumps(subscribe_msg))

            # Replay buffered data to subscribers on reconnect
            await self._replay_buffered_data()

            # Start heartbeat monitor
            heartbeat_task = asyncio.create_task(self._heartbeat_monitor())

            try:
                async for message in ws:
                    self._last_message_time = datetime.utcnow()
                    await self._handle_message(message)
            finally:
                self._connected = False
                heartbeat_task.cancel()
                try:
                    await heartbeat_task
                except asyncio.CancelledError:
                    pass

    async def _heartbeat_monitor(self):
        """Monitor connection health; force reconnect if stale."""
        while self._connected:
            await asyncio.sleep(30)
            if self._last_message_time:
                elapsed = (
                    datetime.utcnow() - self._last_message_time
                ).total_seconds()
                if elapsed > 60:
                    logger.warning(
                        f"No data for {elapsed:.0f}s, forcing reconnect"
                    )
                    if self.ws:
                        await self.ws.close()
                    return

    async def _replay_buffered_data(self):
        """Replay buffered ticks to subscribers after reconnection."""
        for symbol, buffer in self._tick_buffer.items():
            if not buffer:
                continue
            sub_key_1 = f"{symbol}:1"
            if sub_key_1 in self.subscribers and self.subscribers[sub_key_1]:
                latest = buffer[-1]
                await self._broadcast(sub_key_1, latest)
                await self._broadcast(symbol, latest)
                logger.debug(
                    f"Replayed latest tick for {symbol} to subscribers"
                )

    async def _subscribe_to_bybit(self, symbol: str, interval: str = "1"):
        """Subscribe to a symbol/interval on Bybit."""
        sub_key = f"kline.{interval}.{symbol}"

        if sub_key in self.active_bybit_subs:
            return

        subscribe_msg = {"op": "subscribe", "args": [sub_key]}
        await self.ws.send(json.dumps(subscribe_msg))
        self.active_bybit_subs.add(sub_key)
        logger.info(f"Subscribed to {symbol} {interval}m klines")

    async def _handle_message(self, message: str):
        """Process incoming WebSocket message from Bybit."""
        try:
            data = json.loads(message)
            if "topic" not in data:
                return
            topic = data.get("topic", "")
            if topic.startswith("kline."):
                await self._process_kline(data)
        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON received: {message[:100]}")
        except Exception as e:
            logger.error(f"Error processing message: {e}")

    async def _process_kline(self, data: dict):
        """Process kline (candlestick) data and buffer it."""
        try:
            kline_data = data.get("data", [])
            if not kline_data:
                return

            kline = kline_data[0]
            topic = data.get("topic", "")
            parts = topic.split(".")
            interval = parts[1] if len(parts) >= 3 else "1"
            symbol = (
                parts[2]
                if len(parts) >= 3
                else kline.get("symbol", "BTCUSDT")
            )

            close_price = float(kline["close"])

            candle = {
                "time": int(kline["start"]) // 1000,
                "open": float(kline["open"]),
                "high": float(kline["high"]),
                "low": float(kline["low"]),
                "close": close_price,
                "volume": float(kline.get("volume", 0)),
                "confirm": kline.get("confirm", False),
                "symbol": symbol,
                "interval": interval,
            }

            # Buffer the tick for replay
            if symbol in self._tick_buffer:
                self._tick_buffer[symbol].append(candle)

            # Store current candle
            sub_key = f"{symbol}:{interval}"
            self.current_candles[sub_key] = candle
            self.current_candles[symbol] = candle

            # Broadcast to subscribers
            await self._broadcast(sub_key, candle)
            if sub_key != symbol:
                await self._broadcast(symbol, candle)

        except Exception as e:
            logger.error(f"Error processing kline: {e}")

    # ------------------------------------------------------------------
    # Client subscription management
    # ------------------------------------------------------------------

    async def _broadcast(self, key: str, data: dict):
        """Broadcast data to all subscribers of a key."""
        if key not in self.subscribers:
            return
        dead_queues = []
        for queue in self.subscribers[key]:
            try:
                queue.put_nowait(data)
            except asyncio.QueueFull:
                pass
            except Exception:
                dead_queues.append(queue)
        for q in dead_queues:
            self.subscribers[key].discard(q)

    async def subscribe(
        self, symbol: str, queue: asyncio.Queue, interval: str = "1"
    ):
        """Subscribe a client queue to a symbol with specific interval."""
        symbol = symbol.upper()
        sub_key = f"{symbol}:{interval}"

        if sub_key not in self.subscribers:
            self.subscribers[sub_key] = set()

        if self.ws and self._connected:
            await self._subscribe_to_bybit(symbol, interval)

        self.subscribers[sub_key].add(queue)
        logger.debug(f"Client subscribed to {sub_key}")

        # Send current candle immediately if available
        if sub_key in self.current_candles:
            try:
                queue.put_nowait(self.current_candles[sub_key])
            except asyncio.QueueFull:
                pass

    def get_ath_atl(self, symbol: str) -> dict:
        """Get ATH/ATL data for a symbol."""
        return self.ath_atl_data.get(
            symbol.upper(), {"ath": None, "atl": None}
        )

    async def unsubscribe(
        self, symbol: str, queue: asyncio.Queue, interval: str = "1"
    ):
        """Unsubscribe a client queue from a symbol."""
        symbol = symbol.upper()
        sub_key = f"{symbol}:{interval}"
        if sub_key in self.subscribers:
            self.subscribers[sub_key].discard(queue)
            logger.debug(f"Client unsubscribed from {sub_key}")

    async def stop(self):
        """Stop the market stream."""
        self.running = False
        self._connected = False
        if self.ws:
            await self.ws.close()
        # Close Redis
        if self._redis:
            try:
                await self._redis.close()
            except Exception:
                pass

    @property
    def is_connected(self) -> bool:
        return self._connected
