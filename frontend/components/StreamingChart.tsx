/**
 * StreamingChart Component - Terminal Zero
 * Real-time candlestick chart with WebSocket price streaming
 */

"use client";

import { CandlestickData, CandlestickSeries, createChart, IChartApi, ISeriesApi, LineStyle, Time } from "lightweight-charts";
import { useCallback, useEffect, useRef, useState } from "react";

interface StreamingChartProps {
    symbol?: string;
    onPriceUpdate?: (price: number) => void;
}

interface CandleData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    confirm?: boolean;
}

interface AthAtlData {
    ath: number | null;
    atl: number | null;
    updated: string | null;
}

const TIMEFRAMES = [
    { label: "1m", value: "1" },
    { label: "3m", value: "3" },
    { label: "5m", value: "5" },
    { label: "15m", value: "15" },
    { label: "30m", value: "30" },
    { label: "1H", value: "60" },
    { label: "2H", value: "120" },
    { label: "4H", value: "240" },
    { label: "1D", value: "D" },
    { label: "1W", value: "W" },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function StreamingChart({ symbol = "BTCUSDT", onPriceUpdate }: StreamingChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick", Time> | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const mountedRef = useRef<boolean>(true);
    const lastCandleTimeRef = useRef<number>(0);

    const [connected, setConnected] = useState(false);
    const [lastPrice, setLastPrice] = useState<number | null>(null);
    const [priceChange, setPriceChange] = useState<number>(0);
    const [priceChangePercent, setPriceChangePercent] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [selectedTimeframe, setSelectedTimeframe] = useState("1");
    const [athAtl, setAthAtl] = useState<AthAtlData>({ ath: null, atl: null, updated: null });
    const [isLoading, setIsLoading] = useState(true);
    const [high24h, setHigh24h] = useState<number | null>(null);
    const [low24h, setLow24h] = useState<number | null>(null);

    // Terminal Zero color palette
    const COLORS = {
        void: "#05080f",
        abyss: "#080c14",
        surface: "#0d1117",
        depth: "#0a0e15",
        mint: "#00e6a0",
        profit: "#00e6a0",
        loss: "#ff4757",
        border: "#1a1f2e",
        borderSubtle: "#141820",
        textPrimary: "#f0f4f8",
        textSecondary: "#94a3b8",
        textMuted: "#64748b",
        textGhost: "#475569",
    };

    const fetchAthAtl = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/market/ath-atl/${symbol}`);
            if (response.ok) {
                const data = await response.json();
                setAthAtl({
                    ath: data.ath,
                    atl: data.atl,
                    updated: data.updated
                });
            }
        } catch (e) {
            console.error("Error fetching ATH/ATL:", e);
        }
    }, [symbol]);

    const fetchHistoricalData = useCallback(async (interval: string) => {
        setIsLoading(true);
        try {
            const candlesNeeded = {
                "1": 1000, "3": 1000, "5": 1000, "15": 1000, "30": 1000,
                "60": 1000, "120": 1000, "240": 540, "D": 200, "W": 200,
            }[interval] || 500;

            const response = await fetch(
                `${API_BASE}/api/market/klines/${symbol}?interval=${interval}&limit=${candlesNeeded}&extended=true`
            );
            if (response.ok) {
                const data = await response.json();
                if (data.candles && seriesRef.current) {
                    const candles: CandlestickData<Time>[] = data.candles.map((c: CandleData) => ({
                        time: c.time as Time,
                        open: c.open,
                        high: c.high,
                        low: c.low,
                        close: c.close,
                    }));
                    
                    seriesRef.current.setData(candles);
                    
                    if (candles.length > 0) {
                        lastCandleTimeRef.current = candles[candles.length - 1].time as number;
                    }
                    
                    if (candles.length > 0) {
                        const last24hCandles = interval === "1" ? candles.slice(-1440) :
                                               interval === "5" ? candles.slice(-288) :
                                               interval === "15" ? candles.slice(-96) :
                                               interval === "60" ? candles.slice(-24) :
                                               candles.slice(-24);
                        
                        const highs = last24hCandles.map(c => c.high);
                        const lows = last24hCandles.map(c => c.low);
                        setHigh24h(Math.max(...highs));
                        setLow24h(Math.min(...lows));
                        
                        const lastCandle = candles[candles.length - 1];
                        setLastPrice(lastCandle.close);
                        
                        if (candles.length > 1) {
                            const firstCandle = last24hCandles[0];
                            const change = lastCandle.close - firstCandle.open;
                            const changePercent = (change / firstCandle.open) * 100;
                            setPriceChange(change);
                            setPriceChangePercent(changePercent);
                        }
                    }
                    
                    chartRef.current?.timeScale().fitContent();
                }
            }
        } catch (e) {
            console.error("Error fetching historical data:", e);
        } finally {
            setIsLoading(false);
        }
    }, [symbol]);

    useEffect(() => {
        if (!containerRef.current) return;
        
        mountedRef.current = true;

        const chart = createChart(containerRef.current, {
            layout: {
                background: { color: COLORS.void },
                textColor: COLORS.textMuted,
            },
            grid: {
                vertLines: { color: COLORS.borderSubtle },
                horzLines: { color: COLORS.borderSubtle },
            },
            crosshair: {
                mode: 1,
                vertLine: {
                    color: COLORS.textGhost,
                    width: 1,
                    style: LineStyle.Dashed,
                    labelBackgroundColor: COLORS.surface,
                },
                horzLine: {
                    color: COLORS.textGhost,
                    width: 1,
                    style: LineStyle.Dashed,
                    labelBackgroundColor: COLORS.surface,
                },
            },
            rightPriceScale: {
                borderColor: COLORS.border,
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            timeScale: {
                borderColor: COLORS.border,
                timeVisible: true,
                secondsVisible: false,
            },
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: COLORS.profit,
            downColor: COLORS.loss,
            borderUpColor: COLORS.profit,
            borderDownColor: COLORS.loss,
            wickUpColor: COLORS.profit,
            wickDownColor: COLORS.loss,
        });

        chartRef.current = chart;
        seriesRef.current = candleSeries;

        const handleResize = () => {
            if (containerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight,
                });
            }
        };

        window.addEventListener("resize", handleResize);
        fetchAthAtl();
        fetchHistoricalData(selectedTimeframe);

        return () => {
            mountedRef.current = false;
            window.removeEventListener("resize", handleResize);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            seriesRef.current = null;
            chart.remove();
            chartRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [symbol]);

    useEffect(() => {
        if (!chartRef.current) return;

        if (wsRef.current) {
            wsRef.current.close();
        }

        fetchHistoricalData(selectedTimeframe);
        connectWebSocket(selectedTimeframe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTimeframe]);

    const connectWebSocket = (interval: string) => {
        const wsBase = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
        const wsUrl = `${wsBase}/ws/ticker/${symbol}?interval=${interval}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            setConnected(true);
            setError(null);
        };

        ws.onmessage = (event) => {
            try {
                const data: CandleData = JSON.parse(event.data);

                if (mountedRef.current && seriesRef.current) {
                    if (data.time < lastCandleTimeRef.current) {
                        return;
                    }
                    
                    const candle: CandlestickData<Time> = {
                        time: data.time as Time,
                        open: data.open,
                        high: data.high,
                        low: data.low,
                        close: data.close,
                    };

                    seriesRef.current.update(candle);
                    lastCandleTimeRef.current = data.time;
                    setLastPrice(data.close);
                    onPriceUpdate?.(data.close);
                    
                    if (high24h && data.high > high24h) setHigh24h(data.high);
                    if (low24h && data.low < low24h) setLow24h(data.low);
                }
            } catch (e) {
                console.error("Error parsing candle data:", e);
            }
        };

        ws.onerror = () => {
            setError("Connection error");
        };

        ws.onclose = () => {
            setConnected(false);
            setTimeout(() => {
                if (mountedRef.current && wsRef.current?.readyState === WebSocket.CLOSED) {
                    connectWebSocket(interval);
                }
            }, 3000);
        };
    };

    const formatPrice = (price: number) => {
        if (price >= 1000) {
            return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    };

    const isPositive = priceChange >= 0;

    return (
        <div className="chart-container">
            <header className="chart-header">
                <div className="symbol-section">
                    <div className="symbol-badge">
                        <span className="symbol-icon">
                            {symbol.startsWith("BTC") ? "₿" : symbol.startsWith("ETH") ? "Ξ" : "◆"}
                        </span>
                        <span className="symbol-name">{symbol}</span>
                        <span className="perpetual-tag">Perpetual</span>
                    </div>
                    {lastPrice && (
                        <div className="price-display">
                            <span className={`current-price ${isPositive ? "up" : "down"}`}>
                                ${formatPrice(lastPrice)}
                            </span>
                            <span className={`price-delta ${isPositive ? "up" : "down"}`}>
                                {isPositive ? "+" : ""}{formatPrice(priceChange)} ({isPositive ? "+" : ""}{priceChangePercent.toFixed(2)}%)
                            </span>
                        </div>
                    )}
                </div>

                <div className="stats-row">
                    <div className="stat-chip">
                        <span className="chip-label">24h High</span>
                        <span className="chip-value up">{high24h ? `$${formatPrice(high24h)}` : "—"}</span>
                    </div>
                    <div className="stat-chip">
                        <span className="chip-label">24h Low</span>
                        <span className="chip-value down">{low24h ? `$${formatPrice(low24h)}` : "—"}</span>
                    </div>
                    <div className="stat-chip">
                        <span className="chip-label">ATH</span>
                        <span className="chip-value ath">{athAtl.ath ? `$${formatPrice(athAtl.ath)}` : "—"}</span>
                    </div>
                    <div className="stat-chip">
                        <span className="chip-label">ATL</span>
                        <span className="chip-value atl">{athAtl.atl ? `$${formatPrice(athAtl.atl)}` : "—"}</span>
                    </div>
                </div>

                <div className={`connection-status ${connected ? "live" : "offline"}`}>
                    <span className="status-indicator" />
                    <span className="status-label">{connected ? "Live" : error || "Connecting..."}</span>
                </div>
            </header>

            <nav className="timeframe-nav">
                <div className="timeframe-tabs">
                    {TIMEFRAMES.map((tf) => (
                        <button
                            key={tf.value}
                            className={`tf-btn ${selectedTimeframe === tf.value ? "active" : ""}`}
                            onClick={() => setSelectedTimeframe(tf.value)}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
                <div className="nav-tools">
                    <button className="tool-btn" title="Indicators">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                    </button>
                    <button className="tool-btn" title="Drawing Tools">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                        </svg>
                    </button>
                    <button className="tool-btn" title="Settings">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                    </button>
                </div>
            </nav>

            <div className="chart-wrapper">
                {isLoading && (
                    <div className="loading-overlay">
                        <div className="loader">
                            <div className="loader-ring" />
                        </div>
                        <span>Loading chart data...</span>
                    </div>
                )}
                <div ref={containerRef} className="chart-canvas" />
            </div>

            <style jsx>{`
                .chart-container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: var(--void);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    border: 1px solid var(--border-subtle);
                }

                .chart-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 14px 18px;
                    background: var(--surface);
                    border-bottom: 1px solid var(--border-subtle);
                    gap: 20px;
                    flex-wrap: wrap;
                }

                .symbol-section {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .symbol-badge {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .symbol-icon {
                    width: 36px;
                    height: 36px;
                    background: linear-gradient(135deg, #f7931a 0%, #e07800 100%);
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    font-weight: 700;
                    color: white;
                }

                .symbol-name {
                    font-size: 16px;
                    font-weight: 700;
                    color: var(--text-primary);
                    letter-spacing: -0.01em;
                }

                .perpetual-tag {
                    padding: 3px 8px;
                    background: var(--mint-glow);
                    border: 1px solid rgba(0, 230, 160, 0.2);
                    border-radius: var(--radius-sm);
                    font-size: 10px;
                    font-weight: 600;
                    color: var(--mint-400);
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }

                .price-display {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .current-price {
                    font-family: var(--font-mono);
                    font-size: 22px;
                    font-weight: 700;
                    letter-spacing: -0.02em;
                }

                .current-price.up { color: var(--profit-500); }
                .current-price.down { color: var(--loss-500); }

                .price-delta {
                    font-family: var(--font-mono);
                    font-size: 12px;
                    font-weight: 500;
                }

                .price-delta.up { color: var(--profit-400); }
                .price-delta.down { color: var(--loss-400); }

                .stats-row {
                    display: flex;
                    gap: 16px;
                }

                .stat-chip {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    padding: 6px 12px;
                    background: var(--depth);
                    border-radius: var(--radius-md);
                }

                .chip-label {
                    font-size: 10px;
                    color: var(--text-ghost);
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }

                .chip-value {
                    font-family: var(--font-mono);
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .chip-value.up { color: var(--profit-500); }
                .chip-value.down { color: var(--loss-500); }
                .chip-value.ath { color: var(--warning-400); }
                .chip-value.atl { color: #a78bfa; }

                .connection-status {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 14px;
                    background: var(--depth);
                    border-radius: var(--radius-full);
                }

                .status-indicator {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--text-ghost);
                }

                .connection-status.live .status-indicator {
                    background: var(--mint-500);
                    box-shadow: 0 0 10px var(--mint-500);
                    animation: pulse-glow 2s ease-in-out infinite;
                }

                .connection-status.offline .status-indicator {
                    background: var(--loss-500);
                    box-shadow: 0 0 10px var(--loss-500);
                }

                .status-label {
                    font-size: 12px;
                    font-weight: 500;
                    color: var(--text-secondary);
                }

                .timeframe-nav {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 16px;
                    background: var(--abyss);
                    border-bottom: 1px solid var(--border-subtle);
                }

                .timeframe-tabs {
                    display: flex;
                    gap: 4px;
                }

                .tf-btn {
                    padding: 6px 12px;
                    background: transparent;
                    border: none;
                    border-radius: var(--radius-md);
                    color: var(--text-muted);
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }

                .tf-btn:hover {
                    background: var(--depth);
                    color: var(--text-secondary);
                }

                .tf-btn.active {
                    background: linear-gradient(135deg, var(--mint-500), var(--mint-600));
                    color: var(--void);
                }

                .nav-tools {
                    display: flex;
                    gap: 6px;
                }

                .tool-btn {
                    width: 32px;
                    height: 32px;
                    background: transparent;
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-muted);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }

                .tool-btn:hover {
                    background: var(--depth);
                    border-color: var(--border-default);
                    color: var(--text-secondary);
                }

                .chart-wrapper {
                    flex: 1;
                    position: relative;
                    min-height: 400px;
                }

                .loading-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(5, 8, 15, 0.95);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 16px;
                    z-index: 10;
                    color: var(--text-muted);
                    font-size: 13px;
                }

                .loader {
                    position: relative;
                    width: 40px;
                    height: 40px;
                }

                .loader-ring {
                    width: 100%;
                    height: 100%;
                    border: 3px solid var(--border-default);
                    border-top-color: var(--mint-500);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .chart-canvas {
                    width: 100%;
                    height: 100%;
                }

                @media (max-width: 1200px) {
                    .chart-header {
                        gap: 14px;
                    }
                    .stats-row {
                        order: 3;
                        width: 100%;
                        justify-content: space-between;
                    }
                }

                @media (max-width: 768px) {
                    .timeframe-tabs {
                        flex-wrap: wrap;
                    }
                    .stats-row {
                        gap: 8px;
                    }
                    .stat-chip {
                        flex: 1;
                        min-width: 70px;
                    }
                }
            `}</style>
        </div>
    );
}
