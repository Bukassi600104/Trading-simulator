"""
Terminal Zero - Trading Simulator Backend
FastAPI application with WebSocket streaming for crypto prices
and multi-user paper trading support
"""

import asyncio
import os
from contextlib import asynccontextmanager
from decimal import Decimal

import sentry_sdk
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api import trading_router
from app.api.auth import router as auth_router
from app.api.journal import router as journal_router
from app.api.payments import router as payments_router
from app.api.admin import router as admin_router
from app.core.database import init_db
from app.core.middleware import LatencyGuardMiddleware
from app.jobs.leaderboard import update_leaderboard
from jesse_custom.engine import get_portfolio_manager
from jesse_custom.exchange import get_paper_exchange
from services.market_stream import MarketStreamService

# Global services
market_stream: MarketStreamService = None

# Initialize Sentry
if os.getenv("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        traces_sample_rate=1.0,
    )

# Initialize Rate Limiter
limiter = Limiter(key_func=get_remote_address)


def convert_bybit_symbol(bybit_symbol: str) -> str:
    """Convert Bybit symbol (BTCUSDT) to our format (BTC-USDT)"""
    if bybit_symbol.endswith("USDT"):
        base = bybit_symbol[:-4]
        return f"{base}-USDT"
    return bybit_symbol


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle manager"""
    global market_stream
    
    logger.info("🚀 Starting Terminal Zero API...")
    
    # Initialize database tables
    await init_db()
    logger.info("💾 Database initialized")
    
    # Initialize portfolio manager (singleton)
    get_portfolio_manager()
    
    # Initialize paper exchange (singleton)
    get_paper_exchange()
    
    # Initialize market stream service
    market_stream = MarketStreamService()
    
    # Start the Bybit WebSocket connection
    asyncio.create_task(market_stream.start())
    
    # Start price update forwarder
    asyncio.create_task(price_update_forwarder())
    
    # Start scheduled jobs
    asyncio.create_task(scheduler_loop())
    
    logger.info("📈 Portfolio Manager initialized")
    logger.info("📜 Paper Exchange initialized")
    
    yield
    
    # Cleanup
    logger.info("🛑 Shutting down Terminal Zero API...")
    if market_stream:
        await market_stream.stop()


async def scheduler_loop():
    """Run scheduled jobs"""
    while True:
        try:
            await update_leaderboard()
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
        
        # Run every hour
        await asyncio.sleep(3600)


async def price_update_forwarder():
    """
    Forward price updates from market stream to portfolio manager.
    
    This runs as a background task and updates all user portfolios
    when new price data comes in.
    """
    global market_stream
    
    portfolio_manager = get_portfolio_manager()
    
    # Create queues for each symbol we want to track
    btc_queue = asyncio.Queue(maxsize=100)
    eth_queue = asyncio.Queue(maxsize=100)
    
    # Wait for market stream to be ready
    await asyncio.sleep(2)
    
    # Subscribe to price updates
    if market_stream:
        await market_stream.subscribe("BTCUSDT", btc_queue)
        await market_stream.subscribe("ETHUSDT", eth_queue)
    
    logger.info("📡 Price forwarder connected to market stream")
    
    async def process_symbol_queue(queue: asyncio.Queue, symbol: str):
        """Process price updates for a specific symbol"""
        while True:
            try:
                data = await queue.get()
                if "close" in data:
                    price = Decimal(str(data["close"]))
                    await portfolio_manager.on_price_update(symbol, price)
            except Exception as e:
                logger.error(f"Error processing price for {symbol}: {e}")
    
    # Run processors for each symbol
    await asyncio.gather(
        process_symbol_queue(btc_queue, "BTC-USDT"),
        process_symbol_queue(eth_queue, "ETH-USDT")
    )


app = FastAPI(
    title="Terminal Zero API",
    description=(
        "High-frequency crypto trading simulator backend "
        "with multi-user support"
    ),
    version="0.2.0",
    lifespan=lifespan
)

# Register Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middleware
app.add_middleware(LatencyGuardMiddleware)

# CORS configuration for frontend
cors_origins_env = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000")
cors_allow_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
cors_origin_regex = os.getenv(
    "CORS_ALLOW_ORIGIN_REGEX",
    r"https://.*\\.amplifyapp\\.com"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allow_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include trading routes
app.include_router(trading_router)
app.include_router(auth_router)
app.include_router(journal_router)
app.include_router(payments_router)
app.include_router(admin_router)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    portfolio_manager = get_portfolio_manager()
    stats = portfolio_manager.get_stats()
    
    return {
        "status": "healthy",
        "service": "terminal-zero-api",
        "version": "0.2.0",
        "trading_engine": {
            "active_portfolios": stats["active_portfolios"],
            "current_prices": stats["current_prices"]
        }
    }


@app.get("/api/market/klines/{symbol}")
async def get_historical_klines(
    symbol: str,
    interval: str = "1",
    limit: int = 200,
    extended: bool = False,
):
    """
    Get historical klines (candlestick data) for a symbol
    
    Args:
        symbol: Trading pair (e.g., BTCUSDT)
        interval: Timeframe - 1, 3, 5, 15, 30, 60, 120, 240, D, W
        limit: Number of candles to fetch (max 200 for normal, up to 1000 for extended)
        extended: If true, fetch extended history (multiple API calls for 3+ months)
    """
    global market_stream
    
    if not market_stream:
        return {"error": "Market stream not initialized"}
    
    if extended:
        # Extended mode: fetch up to 1000 candles via pagination
        candles = await market_stream.get_extended_historical_klines(
            symbol.upper(), interval, min(limit, 1000)
        )
    else:
        # Normal mode: single API call, max 200
        candles = await market_stream.get_historical_klines(
            symbol.upper(), interval, min(limit, 200)
        )
    
    return {
        "symbol": symbol.upper(),
        "interval": interval,
        "candles": candles
    }


@app.get("/api/market/ath-atl/{symbol}")
async def get_ath_atl(symbol: str):
    """
    Get All-Time High and All-Time Low for a symbol
    
    Args:
        symbol: Trading pair (e.g., BTCUSDT)
    """
    global market_stream
    
    if not market_stream:
        return {"error": "Market stream not initialized"}
    
    data = market_stream.get_ath_atl(symbol.upper())
    
    return {
        "symbol": symbol.upper(),
        "ath": data.get("ath"),
        "atl": data.get("atl"),
        "updated": data.get("updated")
    }


@app.websocket("/ws/ticker/{symbol}")
async def ticker_websocket(websocket: WebSocket, symbol: str, interval: str = "1"):
    """
    WebSocket endpoint for real-time ticker updates
    
    Connects to the market stream service and forwards price updates
    to the connected client.
    
    Args:
        symbol: Trading pair (e.g., BTCUSDT)
        interval: Timeframe - 1, 3, 5, 15, 30, 60, 120, 240, D, W (default: 1)
    """
    await websocket.accept()
    logger.info(f"📡 Client connected for {symbol} ({interval}m)")
    
    # Create a queue for this client
    client_queue: asyncio.Queue = asyncio.Queue()
    
    # Subscribe to the symbol with specific interval
    await market_stream.subscribe(symbol, client_queue, interval)
    
    try:
        while True:
            # Wait for price updates from the market stream
            data = await client_queue.get()
            await websocket.send_json(data)
    except WebSocketDisconnect:
        logger.info(f"📡 Client disconnected from {symbol}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await market_stream.unsubscribe(symbol, client_queue, interval)


@app.websocket("/ws/portfolio")
async def portfolio_websocket(websocket: WebSocket, user_id: str = None):
    """
    WebSocket endpoint for real-time portfolio updates
    
    Streams portfolio state changes as positions and PnL update.
    """
    import uuid
    
    await websocket.accept()
    
    try:
        default_uid = uuid.UUID("00000000-0000-0000-0000-000000000001")
        uid = uuid.UUID(user_id) if user_id else default_uid
    except ValueError:
        await websocket.close(code=1008, reason="Invalid user_id")
        return
    
    logger.info(f"📊 Portfolio WebSocket connected for user {uid}")
    
    portfolio_manager = get_portfolio_manager()
    
    # Get or create portfolio
    portfolio = await portfolio_manager.get_or_create_portfolio(uid)
    
    # Send initial state
    await websocket.send_json({
        "type": "portfolio_snapshot",
        "data": portfolio.to_dict()
    })
    
    # Create update queue and subscribe
    update_queue: asyncio.Queue = asyncio.Queue()
    await portfolio_manager.subscribe_to_updates(uid, update_queue)
    
    try:
        while True:
            # Wait for portfolio updates
            update = await update_queue.get()
            await websocket.send_json(update)
    except WebSocketDisconnect:
        logger.info(f"📊 Portfolio WebSocket disconnected for user {uid}")
    except Exception as e:
        logger.error(f"Portfolio WebSocket error: {e}")
    finally:
        await portfolio_manager.unsubscribe_from_updates(uid)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
