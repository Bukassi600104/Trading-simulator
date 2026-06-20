"""
Terminal Zero - Trading Simulator Backend
FastAPI application with WebSocket streaming for crypto prices
and multi-user paper trading support
"""

import asyncio
import importlib
import os
from contextlib import asynccontextmanager
from decimal import Decimal

try:
    import sentry_sdk  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    sentry_sdk = None
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.database import init_db
from app.core.middleware import InputSanitizationMiddleware, LatencyGuardMiddleware

# Routers are registered defensively (see _register_routers) so a module that
# needs heavy optional deps (numpy/pandas/jesse engine) is simply skipped on a
# slim serverless host instead of breaking app import.
_ROUTER_MODULES = [
    "app.api.trading",
    "app.api.auth",
    "app.api.journal",
    "app.api.payments",
    "app.api.admin",
    "app.api.challenges",
    "app.api.competitions",
    "app.api.leaderboard",
    "app.api.portfolio",
    "app.api.stripe_billing",
    "app.api.gamification",
    "app.api.coaching",
    "app.api.market_data",
    "app.api.alerts",
    "app.api.backtesting",
    "app.api.share",
    "app.api.paystack_billing",
    "app.api.defi",
    "app.api.copy_trading",
    "app.api.strategy_builder",
    "app.api.african_market",
    "app.api.account",
]

# Heavy / optional subsystems (engine, market stream, scientific stack) are
# imported guardedly so the app boots on a slim serverless host (Vercel) that
# does not ship numpy/pandas/ccxt or the jesse_custom engine. They are present
# on the persistent host (VPS) where streaming + the engine actually run.
try:
    from jesse_custom.engine import get_portfolio_manager
    from jesse_custom.exchange import get_paper_exchange
    from services.market_stream import MarketStreamService
except Exception as _engine_import_err:  # pragma: no cover
    get_portfolio_manager = None  # type: ignore
    get_paper_exchange = None  # type: ignore
    MarketStreamService = None  # type: ignore
    logger.warning(
        f"Engine/market-stream unavailable on this host (slim mode): "
        f"{_engine_import_err}"
    )

# Global services
market_stream = None

# Initialize Sentry
if sentry_sdk is not None and os.getenv("SENTRY_DSN"):
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


def _background_workers_enabled() -> bool:
    """Whether this process should run persistent background tasks.

    Persistent loops + WebSocket streaming require a long-lived host (the VPS,
    or Railway today). They cannot run on serverless platforms like Vercel,
    where each invocation is ephemeral. Auto-disabled on Vercel; overridable
    via ENABLE_BACKGROUND_WORKERS.
    """
    explicit = os.getenv("ENABLE_BACKGROUND_WORKERS")
    if explicit is not None:
        return explicit.strip().lower() in ("1", "true", "yes", "on")
    # Default: off on Vercel (serverless), on everywhere else.
    return os.getenv("VERCEL") is None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle manager - resilient to missing services"""
    global market_stream

    logger.info("🚀 Starting Terminal Zero API...")

    # Initialize database tables (non-fatal if DB is unavailable)
    try:
        await init_db()
        logger.info("💾 Database initialized")
    except Exception as e:
        logger.warning(f"⚠️ Database unavailable, skipping init: {e}")

    # Initialize portfolio manager (singleton)
    try:
        get_portfolio_manager()
        logger.info("📈 Portfolio Manager initialized")
    except Exception as e:
        logger.warning(f"⚠️ Portfolio Manager init failed: {e}")

    # Initialize paper exchange (singleton)
    try:
        get_paper_exchange()
        logger.info("📜 Paper Exchange initialized")
    except Exception as e:
        logger.warning(f"⚠️ Paper Exchange init failed: {e}")

    if _background_workers_enabled() and MarketStreamService is not None:
        # Persistent host (VPS / Railway): run streaming + scheduled jobs.
        market_stream = MarketStreamService()
        asyncio.create_task(market_stream.start())
        asyncio.create_task(price_update_forwarder())
        asyncio.create_task(scheduler_loop())
        asyncio.create_task(delayed_price_refresh_loop())
        asyncio.create_task(price_alert_check_loop())
        asyncio.create_task(retention_check_loop())
        logger.info("🔁 Background workers started")
    else:
        # Serverless (Vercel): REST API only. Streaming/engines live on the
        # persistent host. Skip long-lived loops and WebSocket subscriptions.
        logger.info(
            "⏸️  Background workers disabled (serverless mode) — "
            "REST API only; streaming runs on the persistent host"
        )

    yield

    # Cleanup
    logger.info("🛑 Shutting down Terminal Zero API...")
    if market_stream:
        await market_stream.stop()


async def delayed_price_refresh_loop():
    """Refresh delayed (CoinGecko) prices every 15 minutes."""
    from app.services.delayed_prices import refresh_delayed_prices

    while True:
        try:
            await refresh_delayed_prices()
        except Exception as e:
            logger.error(f"Delayed price refresh failed: {e}")
        await asyncio.sleep(900)  # 15 minutes


async def price_alert_check_loop():
    """Check price alerts against current prices every 60 seconds."""
    from app.jobs.price_alerts import check_price_alerts

    while True:
        try:
            await check_price_alerts()
        except Exception as e:
            logger.error(f"Price alert check loop error: {e}")
        await asyncio.sleep(60)


async def retention_check_loop():
    """Run Day 1 retention email checks every 5 minutes."""
    from app.core.database import get_session
    from app.jobs.onboarding_retention import (
        run_one_hour_retention_check,
        run_twenty_four_hour_retention_check,
    )

    while True:
        try:
            async for db in get_session():
                await run_one_hour_retention_check(db)
                await run_twenty_four_hour_retention_check(db)
                break
        except Exception as e:
            logger.error(f"Retention check loop error: {e}")
        await asyncio.sleep(300)  # every 5 minutes


async def scheduler_loop():
    """Run scheduled jobs"""
    from datetime import datetime, timezone

    from app.jobs.leaderboard import update_leaderboard
    from app.jobs.streaks import reset_daily_streaks
    from app.jobs.trial_reminders import process_trial_emails

    _streak_reset_done_today = None
    _trial_emails_done_today = None

    while True:
        try:
            await update_leaderboard()
        except Exception as e:
            logger.error(f"Scheduler error (leaderboard): {e}")

        # Daily streak reset at ~00:05 UTC
        try:
            now = datetime.now(timezone.utc)
            today = now.date()
            if now.hour == 0 and now.minute >= 5 and _streak_reset_done_today != today:
                await reset_daily_streaks()
                _streak_reset_done_today = today
        except Exception as e:
            logger.error(f"Scheduler error (streaks): {e}")

        # Daily trial reminder emails at ~00:10 UTC
        try:
            now = datetime.now(timezone.utc)
            today = now.date()
            if now.hour == 0 and now.minute >= 10 and _trial_emails_done_today != today:
                await process_trial_emails()
                _trial_emails_done_today = today
                logger.info("Trial reminder emails processed")
        except Exception as e:
            logger.error(f"Scheduler error (trial reminders): {e}")

        # Weekly digest on Monday at ~08:00 UTC
        try:
            from app.jobs.weekly_digest import process_weekly_digests
            now = datetime.now(timezone.utc)
            if now.weekday() == 0 and now.hour == 8:
                await process_weekly_digests()
        except Exception as e:
            logger.error(f"Scheduler error (weekly digest): {e}")

        # Run every hour
        await asyncio.sleep(3600)


async def price_update_forwarder():
    """
    Forward price updates from market stream to portfolio manager.

    Dynamically subscribes to all supported symbols (BTC, ETH, SOL, BNB,
    XRP, DOGE) and forwards each tick to the paper exchange and portfolio
    manager.
    """
    global market_stream

    from app.core.config import BYBIT_SYMBOLS, SUPPORTED_SYMBOLS

    portfolio_manager = get_portfolio_manager()
    paper_exchange = get_paper_exchange()

    # Build symbol mapping: Bybit name -> our internal name
    symbol_pairs = list(zip(BYBIT_SYMBOLS, SUPPORTED_SYMBOLS))

    # Create a queue for each symbol
    queues: dict[str, asyncio.Queue] = {
        bybit_sym: asyncio.Queue(maxsize=100)
        for bybit_sym, _ in symbol_pairs
    }

    # Wait for market stream to be ready
    await asyncio.sleep(2)

    # Subscribe to price updates for all symbols
    if market_stream:
        for bybit_sym, _ in symbol_pairs:
            await market_stream.subscribe(bybit_sym, queues[bybit_sym])

    logger.info(
        f"Price forwarder connected for {len(symbol_pairs)} symbols"
    )

    async def process_symbol_queue(
        queue: asyncio.Queue, internal_symbol: str
    ):
        """Process price updates for a specific symbol."""
        while True:
            try:
                data = await queue.get()
                if "close" in data:
                    price = Decimal(str(data["close"]))
                    await paper_exchange.on_price_update(
                        internal_symbol, price
                    )
                    await portfolio_manager.on_price_update(
                        internal_symbol, price
                    )
            except Exception as e:
                logger.error(
                    f"Error processing price for {internal_symbol}: {e}"
                )

    # Run processors for all symbols concurrently
    await asyncio.gather(
        *(
            process_symbol_queue(queues[bybit_sym], internal_sym)
            for bybit_sym, internal_sym in symbol_pairs
        )
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

# Middleware (order matters: outermost runs first)
app.add_middleware(InputSanitizationMiddleware)
app.add_middleware(LatencyGuardMiddleware)

# CORS configuration for frontend
# In production, set CORS_ALLOW_ORIGINS to your actual domain(s).
# Example: CORS_ALLOW_ORIGINS=https://terminalzero.com,https://app.terminalzero.com
cors_origins_env = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000")
cors_allow_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
cors_origin_regex = os.getenv("CORS_ALLOW_ORIGIN_REGEX", "")

cors_kwargs: dict = {
    "allow_origins": cors_allow_origins,
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    "allow_headers": [
        "Authorization",
        "Content-Type",
        "X-Client-Timestamp",
        "X-Requested-With",
        "Accept",
    ],
    "expose_headers": ["Retry-After"],
    "max_age": 600,
}
if cors_origin_regex:
    cors_kwargs["allow_origin_regex"] = cors_origin_regex

app.add_middleware(CORSMiddleware, **cors_kwargs)

# Register routers defensively. On a slim serverless host, a router whose
# module imports heavy optional deps (numpy/pandas/jesse engine) is skipped
# rather than crashing app import; it remains available on the persistent host.
def _register_routers() -> None:
    loaded, skipped = 0, []
    for mod_path in _ROUTER_MODULES:
        try:
            module = importlib.import_module(mod_path)
            app.include_router(module.router)
            loaded += 1
        except Exception as e:
            skipped.append((mod_path, str(e)))
            logger.warning(f"⚠️ Router skipped: {mod_path} ({e})")
    logger.info(
        f"🧭 Routers registered: {loaded} loaded, {len(skipped)} skipped"
    )


_register_routers()


@app.get("/health")
async def health_check():
    """Health check endpoint for load balancers and monitoring."""
    checks = {
        "database": "unknown",
        "redis": "unknown",
    }

    # Check database connectivity
    try:
        from app.core.database import get_session
        from sqlalchemy import text
        async for session in get_session():
            await session.execute(text("SELECT 1"))
            checks["database"] = "connected"
            break
    except Exception:
        checks["database"] = "disconnected"

    # Check Redis connectivity
    try:
        import redis as redis_lib
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
        r = redis_lib.from_url(redis_url, socket_connect_timeout=2)
        r.ping()
        checks["redis"] = "connected"
    except Exception:
        checks["redis"] = "disconnected"

    # Get trading engine stats
    try:
        portfolio_manager = get_portfolio_manager()
        stats = portfolio_manager.get_stats()
        trading_engine = {
            "active_portfolios": stats["active_portfolios"],
            "current_prices": stats["current_prices"],
        }
    except Exception:
        trading_engine = {"active_portfolios": 0, "current_prices": 0}

    all_healthy = all(v == "connected" for v in checks.values())

    # Always return 200 so Railway/load balancer healthchecks pass.
    # The response body still indicates degraded status for monitoring.
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy" if all_healthy else "degraded",
            "service": "terminal-zero-api",
            "version": "0.2.0",
            "environment": os.environ.get("ENVIRONMENT", "development"),
            "checks": checks,
            "trading_engine": trading_engine,
        },
    )


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

    # Lazy fetch if not yet populated (e.g. REST was down at startup)
    if data.get("ath") is None:
        await market_stream._fetch_ath_atl(symbol.upper())
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

    # Streaming requires a persistent host. On serverless there is no
    # market_stream; close cleanly so the client can fall back / retry elsewhere.
    if market_stream is None:
        await websocket.close(code=1013, reason="Streaming unavailable on this host")
        return

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
