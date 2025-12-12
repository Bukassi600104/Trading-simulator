"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import AuthModal from "@/components/AuthModal";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  LineStyle,
} from "lightweight-charts";

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ReplayPage() {
  const searchParams = useSearchParams();
  const symbolParam = searchParams.get("symbol") || "BTCUSDT";
  
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [symbol] = useState(symbolParam);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allCandles, setAllCandles] = useState<CandleData[]>([]);
  const [visibleCandles, setVisibleCandles] = useState<CandleData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("15");

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch historical data
  const fetchHistoricalData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/market/klines/${symbol}?interval=${timeframe}&limit=1000&extended=true`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.candles) {
          setAllCandles(data.candles);
          // Start with first 50 candles visible
          setVisibleCandles(data.candles.slice(0, 50));
          setCurrentIndex(50);
        }
      }
    } catch (e) {
      console.error("Error fetching historical data:", e);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe]);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#0F172A" },
        textColor: "#94A3B8",
      },
      grid: {
        vertLines: { color: "#1E293B" },
        horzLines: { color: "#1E293B" },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#475569",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#334155",
        },
        horzLine: {
          color: "#475569",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#334155",
        },
      },
      rightPriceScale: {
        borderColor: "#334155",
      },
      timeScale: {
        borderColor: "#334155",
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: 500,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candleSeries = (chart as any).addCandlestickSeries({
      upColor: "#10B981",
      downColor: "#EF4444",
      borderUpColor: "#10B981",
      borderDownColor: "#EF4444",
      wickUpColor: "#10B981",
      wickDownColor: "#EF4444",
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;

    fetchHistoricalData();

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
      chart.remove();
    };
  }, [fetchHistoricalData]);

  // Update chart when visible candles change
  useEffect(() => {
    if (seriesRef.current && visibleCandles.length > 0) {
      const chartCandles: CandlestickData<Time>[] = visibleCandles.map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      seriesRef.current.setData(chartCandles);
    }
  }, [visibleCandles]);

  // Playback logic
  useEffect(() => {
    if (isPlaying && currentIndex < allCandles.length) {
      const interval = 1000 / playbackSpeed; // Base speed is 1 candle per second
      
      playIntervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= allCandles.length) {
            setIsPlaying(false);
            return prev;
          }
          setVisibleCandles(allCandles.slice(0, prev + 1));
          return prev + 1;
        });
      }, interval);

      return () => {
        if (playIntervalRef.current) {
          clearInterval(playIntervalRef.current);
        }
      };
    }
  }, [isPlaying, playbackSpeed, allCandles, currentIndex]);

  const handlePlay = () => {
    if (currentIndex >= allCandles.length) {
      // Reset if at end
      setCurrentIndex(50);
      setVisibleCandles(allCandles.slice(0, 50));
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleForward = () => {
    if (currentIndex < allCandles.length) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setVisibleCandles(allCandles.slice(0, newIndex));
    }
  };

  const handleRewind = () => {
    if (currentIndex > 50) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setVisibleCandles(allCandles.slice(0, newIndex));
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(50);
    setVisibleCandles(allCandles.slice(0, 50));
  };

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setSelectedDate(date);
    
    // Find the index of the first candle on or after the selected date
    const targetTimestamp = new Date(date).getTime() / 1000;
    const index = allCandles.findIndex((c) => c.time >= targetTimestamp);
    
    if (index > 0) {
      // Start replay from this point, showing 50 candles before
      const startIndex = Math.max(0, index);
      setCurrentIndex(startIndex);
      setVisibleCandles(allCandles.slice(0, startIndex));
    }
  };

  const currentCandle = visibleCandles[visibleCandles.length - 1];
  const progress = allCandles.length > 0 ? (currentIndex / allCandles.length) * 100 : 0;

  return (
    <div className="replay-page">
      <Navbar onOpenAuth={() => setAuthModalOpen(true)} />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <main className="replay-content">
        <div className="replay-header">
          <div className="header-left">
            <h1>Bar Replay Mode</h1>
            <p className="subtitle">Practice trading with historical data</p>
          </div>
          <div className="header-right">
            <div className="symbol-selector">
              <span className="symbol-icon">₿</span>
              <span className="symbol-name">{symbol}</span>
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="controls-bar">
          <div className="date-picker">
            <label>Start Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateSelect}
            />
          </div>

          <div className="timeframe-selector">
            {["5", "15", "60", "240"].map((tf) => (
              <button
                key={tf}
                className={`tf-btn ${timeframe === tf ? "active" : ""}`}
                onClick={() => {
                  setTimeframe(tf);
                  setIsPlaying(false);
                }}
              >
                {tf === "5" ? "5m" : tf === "15" ? "15m" : tf === "60" ? "1H" : "4H"}
              </button>
            ))}
          </div>

          <div className="playback-controls">
            <button className="control-btn" onClick={handleRewind} disabled={currentIndex <= 50}>
              ⏪
            </button>
            {isPlaying ? (
              <button className="control-btn play" onClick={handlePause}>
                ⏸
              </button>
            ) : (
              <button className="control-btn play" onClick={handlePlay}>
                ▶
              </button>
            )}
            <button className="control-btn" onClick={handleForward} disabled={currentIndex >= allCandles.length}>
              ⏩
            </button>
            <button className="control-btn reset" onClick={handleReset}>
              ↺
            </button>
          </div>

          <div className="speed-selector">
            <span>Speed:</span>
            {[0.5, 1, 5, 10].map((speed) => (
              <button
                key={speed}
                className={`speed-btn ${playbackSpeed === speed ? "active" : ""}`}
                onClick={() => handleSpeedChange(speed)}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
          <div className="progress-text">
            {currentIndex} / {allCandles.length} candles
          </div>
        </div>

        {/* Chart Container */}
        <div className="chart-wrapper">
          {isLoading ? (
            <div className="loading">Loading historical data...</div>
          ) : (
            <div ref={containerRef} className="chart-container" />
          )}

          {/* Current Price Display */}
          {currentCandle && (
            <div className="price-display">
              <div className="price-item">
                <span className="label">Open</span>
                <span className="value">${currentCandle.open.toLocaleString()}</span>
              </div>
              <div className="price-item">
                <span className="label">High</span>
                <span className="value positive">${currentCandle.high.toLocaleString()}</span>
              </div>
              <div className="price-item">
                <span className="label">Low</span>
                <span className="value negative">${currentCandle.low.toLocaleString()}</span>
              </div>
              <div className="price-item">
                <span className="label">Close</span>
                <span className="value">${currentCandle.close.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Replay Notice */}
        <div className="replay-notice">
          <span className="notice-icon">⚠️</span>
          <span>Future data is hidden. Practice your analysis without hindsight bias!</span>
        </div>
      </main>

      <style jsx>{`
        .replay-page {
          min-height: 100vh;
          background: #0F172A;
        }

        .replay-content {
          max-width: 1600px;
          margin: 0 auto;
          padding: 24px;
        }

        .replay-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .header-left h1 {
          font-size: 28px;
          font-weight: 700;
          color: #F1F5F9;
          margin: 0 0 8px 0;
        }

        .subtitle {
          color: #64748B;
          margin: 0;
        }

        .symbol-selector {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #1E293B;
          border-radius: 8px;
          border: 1px solid #334155;
        }

        .symbol-icon {
          font-size: 20px;
        }

        .symbol-name {
          font-weight: 600;
          color: #F1F5F9;
        }

        .controls-bar {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 16px 20px;
          background: #1E293B;
          border-radius: 12px;
          border: 1px solid #334155;
          margin-bottom: 16px;
        }

        .date-picker {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .date-picker label {
          color: #64748B;
          font-size: 14px;
        }

        .date-picker input {
          padding: 8px 12px;
          background: #0F172A;
          border: 1px solid #334155;
          border-radius: 6px;
          color: #F1F5F9;
          font-size: 14px;
        }

        .timeframe-selector {
          display: flex;
          gap: 4px;
        }

        .tf-btn {
          padding: 8px 12px;
          background: #0F172A;
          border: 1px solid #334155;
          border-radius: 6px;
          color: #94A3B8;
          cursor: pointer;
          font-size: 13px;
        }

        .tf-btn.active {
          background: #3B82F6;
          border-color: #3B82F6;
          color: white;
        }

        .playback-controls {
          display: flex;
          gap: 8px;
        }

        .control-btn {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: #0F172A;
          border: 1px solid #334155;
          color: #94A3B8;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .control-btn:hover:not(:disabled) {
          background: #334155;
          color: #F1F5F9;
        }

        .control-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .control-btn.play {
          background: #10B981;
          border-color: #10B981;
          color: white;
        }

        .control-btn.reset {
          background: #64748B;
          border-color: #64748B;
          color: white;
        }

        .speed-selector {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }

        .speed-selector span {
          color: #64748B;
          font-size: 14px;
        }

        .speed-btn {
          padding: 6px 10px;
          background: #0F172A;
          border: 1px solid #334155;
          border-radius: 4px;
          color: #94A3B8;
          cursor: pointer;
          font-size: 12px;
        }

        .speed-btn.active {
          background: #334155;
          color: #F1F5F9;
        }

        .progress-bar {
          position: relative;
          height: 6px;
          background: #1E293B;
          border-radius: 3px;
          margin-bottom: 16px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3B82F6 0%, #10B981 100%);
          border-radius: 3px;
          transition: width 0.3s;
        }

        .progress-text {
          position: absolute;
          right: 0;
          top: 12px;
          font-size: 12px;
          color: #64748B;
        }

        .chart-wrapper {
          position: relative;
          background: #0F172A;
          border-radius: 12px;
          border: 1px solid #334155;
          overflow: hidden;
        }

        .chart-container {
          width: 100%;
          height: 500px;
        }

        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 500px;
          color: #64748B;
        }

        .price-display {
          position: absolute;
          top: 16px;
          left: 16px;
          display: flex;
          gap: 24px;
          padding: 12px 16px;
          background: rgba(15, 23, 42, 0.9);
          border-radius: 8px;
          border: 1px solid #334155;
        }

        .price-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .price-item .label {
          font-size: 11px;
          color: #64748B;
          text-transform: uppercase;
        }

        .price-item .value {
          font-size: 14px;
          font-weight: 600;
          color: #F1F5F9;
          font-family: 'JetBrains Mono', monospace;
        }

        .price-item .value.positive {
          color: #10B981;
        }

        .price-item .value.negative {
          color: #EF4444;
        }

        .replay-notice {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          margin-top: 16px;
        }

        .notice-icon {
          font-size: 20px;
        }

        .replay-notice span {
          color: #94A3B8;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
