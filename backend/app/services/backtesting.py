"""
Backtesting engine: replays OHLCV data and simulates strategy execution.
Uses pandas + numpy for signal calculation.
"""
import math
from datetime import datetime, timezone
from typing import Optional
import httpx
import pandas as pd
import numpy as np
from loguru import logger
from app.core.config import SUPPORTED_SYMBOLS


def _to_bybit(symbol: str) -> str:
    """Map internal symbol (BTC-USDT) to Bybit symbol (BTCUSDT)."""
    return symbol.replace("-", "")


def _interval_ms(interval: str) -> int:
    multipliers = {"1": 60000, "5": 300000, "15": 900000, "60": 3600000, "240": 14400000, "D": 86400000}
    return multipliers.get(interval, 3600000)


async def fetch_ohlcv(symbol: str, interval: str, start_date: str, end_date: str) -> pd.DataFrame:
    """Fetch OHLCV data from Bybit REST API for backtesting period."""
    bybit_symbol = _to_bybit(symbol)

    interval_map = {"1": "1", "5": "5", "15": "15", "60": "60", "240": "240", "D": "D"}
    bybit_interval = interval_map.get(str(interval), "60")

    start_ts = int(datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc).timestamp() * 1000)
    end_ts = int(datetime.fromisoformat(end_date).replace(tzinfo=timezone.utc).timestamp() * 1000)

    all_candles = []
    current_ts = start_ts

    async with httpx.AsyncClient(timeout=30) as client:
        while current_ts < end_ts:
            url = "https://api.bybit.com/v5/market/kline"
            params = {
                "category": "linear",
                "symbol": bybit_symbol,
                "interval": bybit_interval,
                "start": current_ts,
                "end": min(end_ts, current_ts + 200 * _interval_ms(bybit_interval)),
                "limit": 200,
            }
            resp = await client.get(url, params=params)
            data = resp.json()

            if data.get("retCode") != 0 or not data.get("result", {}).get("list"):
                break

            candles = data["result"]["list"]
            if not candles:
                break

            all_candles.extend(candles)
            # Bybit returns newest first; advance past the oldest candle
            oldest_ts = int(candles[-1][0])
            if oldest_ts <= current_ts:
                break
            current_ts = oldest_ts

    if not all_candles:
        return pd.DataFrame()

    # Bybit returns: [startTime, openPrice, highPrice, lowPrice, closePrice, volume, turnover]
    df = pd.DataFrame(all_candles, columns=["timestamp", "open", "high", "low", "close", "volume", "turnover"])
    df["timestamp"] = pd.to_datetime(df["timestamp"].astype(int), unit="ms", utc=True)
    df[["open", "high", "low", "close", "volume"]] = df[["open", "high", "low", "close", "volume"]].astype(float)
    df = df.sort_values("timestamp").reset_index(drop=True)

    # Filter to requested date range
    start_dt = pd.Timestamp(start_date, tz="UTC")
    end_dt = pd.Timestamp(end_date, tz="UTC")
    df = df[(df["timestamp"] >= start_dt) & (df["timestamp"] <= end_dt)]

    return df


def _calc_rsi(closes: pd.Series, period: int = 14) -> pd.Series:
    delta = closes.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / period, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1 / period, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def _calc_sma(closes: pd.Series, period: int) -> pd.Series:
    return closes.rolling(period).mean()


def _calc_ema(closes: pd.Series, period: int) -> pd.Series:
    return closes.ewm(span=period, adjust=False).mean()


def run_strategy(df: pd.DataFrame, strategy: dict, starting_capital: float, fee_rate: float = 0.0006) -> dict:
    """Run strategy simulation on OHLCV DataFrame."""
    if df.empty or len(df) < 30:
        raise ValueError("Not enough data to run backtest (need at least 30 bars)")

    closes = df["close"]
    entry_cond = strategy.get("entry_condition", "rsi_below_30")
    exit_cond = strategy.get("exit_condition", "rsi_above_70")
    stop_loss_pct = float(strategy.get("stop_loss_pct", 0)) / 100
    take_profit_pct = float(strategy.get("take_profit_pct", 0)) / 100

    # Calculate indicators
    rsi = _calc_rsi(closes)
    sma20 = _calc_sma(closes, 20)
    ema12 = _calc_ema(closes, 12)
    ema26 = _calc_ema(closes, 26)

    # Generate signals
    buy_signal = pd.Series(False, index=df.index)
    sell_signal = pd.Series(False, index=df.index)

    if entry_cond == "rsi_below_30":
        buy_signal = (rsi < 30) & (rsi.shift(1) >= 30)
    elif entry_cond == "price_above_sma20":
        buy_signal = (closes > sma20) & (closes.shift(1) <= sma20.shift(1))
    elif entry_cond == "ema_crossover":
        buy_signal = (ema12 > ema26) & (ema12.shift(1) <= ema26.shift(1))

    if exit_cond == "rsi_above_70":
        sell_signal = (rsi > 70) & (rsi.shift(1) <= 70)
    elif exit_cond == "price_below_sma20":
        sell_signal = (closes < sma20) & (closes.shift(1) >= sma20.shift(1))

    # Simulate trades
    capital = starting_capital
    position_size = 0.0
    entry_price = 0.0
    entry_time = None
    trades = []
    equity_curve = [{"timestamp": str(df.iloc[0]["timestamp"]), "balance": starting_capital}]

    for i in range(1, len(df)):
        row = df.iloc[i]
        price = float(row["close"])
        ts = str(row["timestamp"])

        if position_size > 0:
            current_pnl_pct = (price - entry_price) / entry_price
            should_exit = bool(sell_signal.iloc[i])

            if stop_loss_pct > 0 and current_pnl_pct <= -stop_loss_pct:
                should_exit = True
            if take_profit_pct > 0 and current_pnl_pct >= take_profit_pct:
                should_exit = True

            if should_exit:
                exit_value = position_size * price
                fee = exit_value * fee_rate
                pnl = exit_value - (position_size * entry_price) - fee - (position_size * entry_price * fee_rate)
                capital += exit_value - fee
                pnl_pct = (price - entry_price) / entry_price * 100

                trades.append({
                    "entry_time": str(entry_time),
                    "exit_time": ts,
                    "side": "LONG",
                    "entry_price": round(entry_price, 4),
                    "exit_price": round(price, 4),
                    "pnl": round(pnl, 2),
                    "pnl_pct": round(pnl_pct, 2),
                })
                position_size = 0.0
                entry_price = 0.0

        elif buy_signal.iloc[i] and position_size == 0:
            invest = capital * 0.95
            fee = invest * fee_rate
            position_size = (invest - fee) / price
            entry_price = price
            entry_time = ts
            capital -= invest

        equity_curve.append({"timestamp": ts, "balance": round(capital + position_size * price, 2)})

    # Close any open position at end
    if position_size > 0:
        price = float(df.iloc[-1]["close"])
        exit_value = position_size * price
        fee = exit_value * fee_rate
        capital += exit_value - fee

    final_capital = round(capital, 2)
    total_return_pct = round((final_capital - starting_capital) / starting_capital * 100, 2)

    wins = [t for t in trades if t["pnl"] > 0]
    losses = [t for t in trades if t["pnl"] <= 0]
    win_rate = round(len(wins) / len(trades) * 100, 1) if trades else 0.0

    # Sharpe ratio from equity curve
    balances = [e["balance"] for e in equity_curve]
    if len(balances) > 1:
        returns = np.diff(balances) / np.array(balances[:-1])
        std = float(np.std(returns, ddof=1))
        sharpe = float(np.mean(returns) / std * math.sqrt(252)) if std > 0 else 0.0
    else:
        sharpe = 0.0

    # Max drawdown
    peak = starting_capital
    max_dd = 0.0
    for e in equity_curve:
        b = e["balance"]
        if b > peak:
            peak = b
        dd = (peak - b) / peak * 100 if peak > 0 else 0
        if dd > max_dd:
            max_dd = dd

    # Downsample equity curve if too large (max 500 points)
    if len(equity_curve) > 500:
        step = len(equity_curve) // 500
        equity_curve = equity_curve[::step]

    return {
        "final_capital": final_capital,
        "total_return_pct": total_return_pct,
        "sharpe_ratio": round(sharpe, 4),
        "max_drawdown_pct": round(max_dd, 2),
        "win_rate": win_rate,
        "total_trades": len(trades),
        "winning_trades": len(wins),
        "losing_trades": len(losses),
        "avg_win_pct": round(sum(t["pnl_pct"] for t in wins) / len(wins), 2) if wins else 0.0,
        "avg_loss_pct": round(sum(t["pnl_pct"] for t in losses) / len(losses), 2) if losses else 0.0,
        "best_trade_pct": round(max((t["pnl_pct"] for t in trades), default=0), 2),
        "worst_trade_pct": round(min((t["pnl_pct"] for t in trades), default=0), 2),
        "equity_curve": equity_curve,
        "trades": trades[:100],  # Cap at 100 for response size
    }
