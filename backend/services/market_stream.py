"""
Market Stream Service
Connects to Bybit WebSocket and streams real-time price data
"""

import asyncio
import json
from datetime import datetime
from typing import Dict, Set

import httpx
import websockets
from loguru import logger


class MarketStreamService:
    """
    Service that connects to Bybit USDT Perpetual WebSocket
    and distributes price updates to subscribed clients
    """
    
    BYBIT_WS_URL = "wss://stream.bybit.com/v5/public/linear"
    BYBIT_REST_URL = "https://api.bybit.com"
    
    # Supported timeframes mapping to Bybit intervals
    TIMEFRAMES = {
        "1": "1",      # 1 minute
        "3": "3",      # 3 minutes
        "5": "5",      # 5 minutes
        "15": "15",    # 15 minutes
        "30": "30",    # 30 minutes
        "60": "60",    # 1 hour
        "120": "120",  # 2 hours
        "240": "240",  # 4 hours
        "D": "D",      # 1 day
        "W": "W",      # 1 week
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
        
    async def start(self):
        """Start the market stream connection"""
        self.running = True
        
        # Fetch initial ATH/ATL data
        await self._fetch_ath_atl("BTCUSDT")
        await self._fetch_ath_atl("ETHUSDT")
        
        while self.running:
            try:
                await self._connect()
            except Exception as e:
                logger.error(f"Connection error: {e}")
                if self.running:
                    logger.info("Reconnecting in 5 seconds...")
                    await asyncio.sleep(5)
    
    async def _fetch_ath_atl(self, symbol: str):
        """Fetch All-Time High and All-Time Low from Bybit REST API"""
        try:
            async with httpx.AsyncClient() as client:
                # Get weekly klines for ATH/ATL estimation (max history)
                url = f"{self.BYBIT_REST_URL}/v5/market/kline"
                params = {
                    "category": "linear",
                    "symbol": symbol,
                    "interval": "W",
                    "limit": 200  # Get max history
                }
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("retCode") == 0:
                        klines = data.get("result", {}).get("list", [])
                        if klines:
                            # Format: [time, open, high, low, close, vol, turnover]
                            highs = [float(k[2]) for k in klines]
                            lows = [float(k[3]) for k in klines]
                            
                            self.ath_atl_data[symbol] = {
                                "ath": max(highs),
                                "atl": min(lows),
                                "updated": datetime.now().isoformat()
                            }
                            logger.info(
                                f"📊 {symbol} ATH: ${max(highs):,.2f}, "
                                f"ATL: ${min(lows):,.2f}"
                            )
        except Exception as e:
            logger.error(f"Error fetching ATH/ATL for {symbol}: {e}")

    async def get_historical_klines(
        self, symbol: str, interval: str = "1", limit: int = 200
    ):
        """Fetch historical klines from Bybit REST API"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.BYBIT_REST_URL}/v5/market/kline"
                params = {
                    "category": "linear",
                    "symbol": symbol,
                    "interval": interval,
                    "limit": min(limit, 200)  # Bybit max is 200 per request
                }
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("retCode") == 0:
                        klines = data.get("result", {}).get("list", [])
                        # Convert to chart format and reverse (oldest first)
                        candles = []
                        for k in reversed(klines):
                            candles.append({
                                "time": int(k[0]) // 1000,
                                "open": float(k[1]),
                                "high": float(k[2]),
                                "low": float(k[3]),
                                "close": float(k[4]),
                                "volume": float(k[5])
                            })
                        return candles
        except Exception as e:
            logger.error(f"Error fetching historical klines: {e}")
        return []

    async def get_extended_historical_klines(
        self, symbol: str, interval: str = "1", limit: int = 1000
    ):
        """
        Fetch extended historical klines by making multiple paginated requests.
        This allows fetching up to 3+ months of data.

        Args:
            symbol: Trading pair (e.g., BTCUSDT)
            interval: Timeframe - 1, 3, 5, 15, 30, 60, 120, 240, D, W
            limit: Total candles to fetch (multiple requests if > 200)
        """
        all_candles = []
        remaining = limit
        end_time = None  # Start from current time
        
        try:
            async with httpx.AsyncClient() as client:
                while remaining > 0:
                    batch_limit = min(remaining, 200)
                    url = f"{self.BYBIT_REST_URL}/v5/market/kline"
                    params = {
                        "category": "linear",
                        "symbol": symbol,
                        "interval": interval,
                        "limit": batch_limit
                    }
                    
                    # Add end time for pagination (fetch older data)
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
                    
                    # Convert to chart format
                    batch_candles = []
                    for k in klines:
                        batch_candles.append({
                            "time": int(k[0]) // 1000,
                            "open": float(k[1]),
                            "high": float(k[2]),
                            "low": float(k[3]),
                            "close": float(k[4]),
                            "volume": float(k[5])
                        })
                    
                    # Prepend older candles (klines come newest-first from API)
                    all_candles = batch_candles + all_candles
                    
                    # Set end_time for next batch (oldest candle's start time - 1ms)
                    oldest_candle_time = int(klines[-1][0])
                    end_time = oldest_candle_time - 1
                    
                    remaining -= len(klines)
                    
                    # Avoid rate limiting
                    if remaining > 0:
                        await asyncio.sleep(0.1)
                        
        except Exception as e:
            logger.error(f"Error fetching extended historical klines: {e}")
        
        # Return in chronological order (oldest first)
        all_candles.sort(key=lambda x: x["time"])
        return all_candles
    
    async def _connect(self):
        """Establish WebSocket connection to Bybit"""
        logger.info("🔌 Connecting to Bybit WebSocket...")
        
        async with websockets.connect(self.BYBIT_WS_URL) as ws:
            self.ws = ws
            logger.info("✅ Connected to Bybit WebSocket")
            
            # Subscribe to default symbols with 1-minute interval
            await self._subscribe_to_bybit("BTCUSDT", "1")
            await self._subscribe_to_bybit("ETHUSDT", "1")
            
            # Process incoming messages
            async for message in ws:
                await self._handle_message(message)
    
    async def _subscribe_to_bybit(self, symbol: str, interval: str = "1"):
        """Subscribe to a symbol/interval on Bybit"""
        sub_key = f"kline.{interval}.{symbol}"
        
        if sub_key in self.active_bybit_subs:
            return  # Already subscribed
            
        subscribe_msg = {
            "op": "subscribe",
            "args": [sub_key]
        }
        await self.ws.send(json.dumps(subscribe_msg))
        self.active_bybit_subs.add(sub_key)
        logger.info(f"📊 Subscribed to {symbol} {interval}m klines")
    
    async def _handle_message(self, message: str):
        """Process incoming WebSocket message from Bybit"""
        try:
            data = json.loads(message)
            
            # Skip non-data messages (like subscription confirmations)
            if "topic" not in data:
                return
            
            topic = data.get("topic", "")
            logger.debug(f"Received topic: {topic}")
            
            # Handle kline data
            if topic.startswith("kline."):
                await self._process_kline(data)
                
        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON received: {message[:100]}")
        except Exception as e:
            logger.error(f"Error processing message: {e}")
    
    async def _process_kline(self, data: dict):
        """Process kline (candlestick) data"""
        try:
            kline_data = data.get("data", [])
            if not kline_data:
                return
            
            kline = kline_data[0]
            topic = data.get("topic", "")
            
            # Parse topic like "kline.1.BTCUSDT" -> interval=1, symbol=BTCUSDT
            parts = topic.split(".")
            interval = parts[1] if len(parts) >= 3 else "1"
            symbol = parts[2] if len(parts) >= 3 else kline.get("symbol", "BTCUSDT")
            
            close_price = float(kline["close"])
            logger.info(f"📈 {symbol} ({interval}): ${close_price:.2f}")
            
            # Format candle for lightweight-charts
            candle = {
                "time": int(kline["start"]) // 1000,  # Convert to seconds
                "open": float(kline["open"]),
                "high": float(kline["high"]),
                "low": float(kline["low"]),
                "close": close_price,
                "volume": float(kline.get("volume", 0)),
                "confirm": kline.get("confirm", False),
                "symbol": symbol,
                "interval": interval
            }
            
            # Store current candle with symbol:interval key
            sub_key = f"{symbol}:{interval}"
            self.current_candles[sub_key] = candle
            
            # Also store for legacy symbol-only subscriptions
            self.current_candles[symbol] = candle
            
            # Broadcast to interval-specific subscribers
            await self._broadcast(sub_key, candle)
            
            # Also broadcast to legacy symbol-only subscribers (for backward compat)
            if sub_key != symbol:
                await self._broadcast(symbol, candle)
            
        except Exception as e:
            logger.error(f"Error processing kline: {e}")
    
    async def _broadcast(self, key: str, data: dict):
        """Broadcast data to all subscribers of a key (symbol or symbol:interval)"""
        if key not in self.subscribers:
            return
        
        for queue in self.subscribers[key]:
            try:
                # Non-blocking put
                queue.put_nowait(data)
            except asyncio.QueueFull:
                pass  # Skip if queue is full
    
    async def subscribe(self, symbol: str, queue: asyncio.Queue, interval: str = "1"):
        """Subscribe a client queue to a symbol with specific interval"""
        symbol = symbol.upper()
        sub_key = f"{symbol}:{interval}"
        
        if sub_key not in self.subscribers:
            self.subscribers[sub_key] = set()
            
        # Subscribe to Bybit for this symbol/interval combo if needed
        if self.ws:
            await self._subscribe_to_bybit(symbol, interval)
        
        self.subscribers[sub_key].add(queue)
        logger.debug(f"Client subscribed to {sub_key}")
        
        # Send current candle immediately if available
        if sub_key in self.current_candles:
            queue.put_nowait(self.current_candles[sub_key])
    
    def get_ath_atl(self, symbol: str) -> dict:
        """Get ATH/ATL data for a symbol"""
        return self.ath_atl_data.get(symbol.upper(), {"ath": None, "atl": None})
    
    async def unsubscribe(self, symbol: str, queue: asyncio.Queue, interval: str = "1"):
        """Unsubscribe a client queue from a symbol"""
        symbol = symbol.upper()
        sub_key = f"{symbol}:{interval}"
        
        if sub_key in self.subscribers:
            self.subscribers[sub_key].discard(queue)
            logger.debug(f"Client unsubscribed from {sub_key}")
    
    async def stop(self):
        """Stop the market stream"""
        self.running = False
        if self.ws:
            await self.ws.close()
