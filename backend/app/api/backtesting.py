"""Backtesting API - Pro feature"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from loguru import logger

from app.core.config import SUPPORTED_SYMBOLS
from app.core.security import TokenData, get_user_id_from_token, require_auth

router = APIRouter(prefix="/api/backtest", tags=["backtesting"])

AVAILABLE_STRATEGIES = {
    "entry": [
        {"id": "rsi_below_30", "name": "RSI Oversold (< 30)", "description": "Buy when RSI drops below 30"},
        {"id": "price_above_sma20", "name": "SMA20 Breakout", "description": "Buy when price crosses above 20-period SMA"},
        {"id": "ema_crossover", "name": "EMA Crossover (12/26)", "description": "Buy when EMA12 crosses above EMA26"},
    ],
    "exit": [
        {"id": "rsi_above_70", "name": "RSI Overbought (> 70)", "description": "Sell when RSI goes above 70"},
        {"id": "price_below_sma20", "name": "SMA20 Breakdown", "description": "Sell when price drops below SMA20"},
        {"id": "stop_loss_5pct", "name": "Stop Loss 5%", "description": "Exit if trade loses more than 5%"},
        {"id": "take_profit_10pct", "name": "Take Profit 10%", "description": "Exit when trade gains 10%"},
    ],
}


class StrategyConfig(BaseModel):
    entry_condition: str
    exit_condition: str
    stop_loss_pct: float = Field(default=0, ge=0, le=50)
    take_profit_pct: float = Field(default=0, ge=0, le=200)


class BacktestRequest(BaseModel):
    symbol: str
    interval: str = "60"
    strategy: StrategyConfig
    starting_capital: float = Field(default=10000, ge=100, le=1000000)
    start_date: str  # ISO date "2024-01-01"
    end_date: str


@router.get("/symbols")
async def get_symbols():
    return {"symbols": SUPPORTED_SYMBOLS}


@router.get("/strategies")
async def get_strategies():
    return AVAILABLE_STRATEGIES


@router.post("/run")
async def run_backtest(
    request: BacktestRequest,
    token_data: TokenData = Depends(require_auth),
):
    """Run a backtest. Pro feature."""
    user_id = get_user_id_from_token(token_data)

    if request.symbol not in SUPPORTED_SYMBOLS:
        raise HTTPException(status_code=400, detail=f"Symbol must be one of: {SUPPORTED_SYMBOLS}")

    valid_intervals = ["1", "5", "15", "60", "240", "D"]
    if request.interval not in valid_intervals:
        raise HTTPException(status_code=400, detail=f"Interval must be one of: {valid_intervals}")

    try:
        start_date = date.fromisoformat(request.start_date)
        end_date = date.fromisoformat(request.end_date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")

    if (end_date - start_date).days < 7:
        raise HTTPException(status_code=400, detail="Date range must be at least 7 days")
    if (end_date - start_date).days > 365:
        raise HTTPException(status_code=400, detail="Date range cannot exceed 365 days")

    try:
        from app.services.backtesting import fetch_ohlcv, run_strategy

        df = await fetch_ohlcv(
            request.symbol,
            request.interval,
            request.start_date,
            request.end_date,
        )

        if df.empty:
            raise HTTPException(status_code=400, detail="No market data available for this symbol/period")

        results = run_strategy(
            df,
            request.strategy.model_dump(),
            request.starting_capital,
        )

        return {
            "symbol": request.symbol,
            "interval": request.interval,
            "start_date": request.start_date,
            "end_date": request.end_date,
            "starting_capital": request.starting_capital,
            "strategy": request.strategy.model_dump(),
            **results,
        }

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Backtest failed for {request.symbol}: {e}")
        raise HTTPException(status_code=500, detail="Backtest execution failed. Try a different date range or symbol.")
