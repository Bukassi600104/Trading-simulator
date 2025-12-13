/**
 * PortfolioWidget Component - Terminal Zero
 * Real-time portfolio stats with WebSocket connection
 */

"use client";

import { API_BASE, WS_BASE } from "@/lib/runtimeConfig";
import { useCallback, useEffect, useRef, useState } from "react";

interface Portfolio {
  balance: number;
  equity: number;
  total_margin_used: number;
  available_margin: number;
  total_unrealized_pnl: number;
  starting_balance: number;
  leverage: number;
}

export default function PortfolioWidget() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);

  const fetchPortfolio = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/trading/portfolio`);
      const data = await response.json();
      if (mountedRef.current) {
        setPortfolio(data);
      }
    } catch (err) {
      console.error("Failed to fetch portfolio:", err);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    const ws = new WebSocket(`${WS_BASE}/ws/portfolio`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (mountedRef.current) {
        setConnected(true);
      }
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === "portfolio_snapshot" || data.type === "portfolio_update") {
          setPortfolio(data.data);
        }
      } catch (e) {
        console.error("Error parsing portfolio data:", e);
      }
    };

    ws.onclose = () => {
      if (mountedRef.current) {
        setConnected(false);
      }
      setTimeout(() => {
        if (mountedRef.current && wsRef.current?.readyState === WebSocket.CLOSED) {
          connectWebSocket();
        }
      }, 3000);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchPortfolio();
    connectWebSocket();

    return () => {
      mountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchPortfolio, connectWebSocket]);

  const handleReset = async () => {
    try {
      await fetch(`${API_BASE}/api/trading/reset`, { method: "POST" });
      fetchPortfolio();
    } catch (err) {
      console.error("Failed to reset portfolio:", err);
    }
  };

  if (!portfolio) {
    return (
      <div className="portfolio-widget loading">
        <div className="loading-pulse" />
        <span>Loading portfolio...</span>
        <style jsx>{`
          .portfolio-widget.loading {
            background: var(--surface);
            border-radius: var(--radius-lg);
            padding: 48px;
            text-align: center;
            color: var(--text-ghost);
            border: 1px solid var(--border-subtle);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
          }
          .loading-pulse {
            width: 32px;
            height: 32px;
            border: 2px solid var(--border-default);
            border-top-color: var(--mint-500);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Parse numeric values from API (may be Decimal strings)
  const equity = parseFloat(String(portfolio.equity)) || 0;
  const balance = parseFloat(String(portfolio.balance)) || 0;
  const startingBalance = parseFloat(String(portfolio.starting_balance)) || 10000;
  const unrealizedPnl = parseFloat(String(portfolio.total_unrealized_pnl)) || 0;
  const marginUsed = parseFloat(String(portfolio.total_margin_used)) || 0;
  const availableMargin = parseFloat(String(portfolio.available_margin)) || 0;

  const totalPnL = equity - startingBalance;
  const pnlPercent = ((totalPnL / startingBalance) * 100).toFixed(2);
  const isProfitable = totalPnL >= 0;
  const marginPercent = equity > 0 ? (marginUsed / equity) * 100 : 0;

  return (
    <div className="portfolio-widget">
      <header className="widget-header">
        <h3>Portfolio</h3>
        <div className="header-actions">
          <span className={`status ${connected ? "live" : "offline"}`}>
            <span className="status-dot" />
            {connected ? "Live" : "Offline"}
          </span>
          <button className="reset-btn" onClick={handleReset}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
            Reset
          </button>
        </div>
      </header>

      <div className="equity-display">
        <span className="equity-label">Total Equity</span>
        <span className="equity-value">
          ${equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className={`pnl-badge ${isProfitable ? "profit" : "loss"}`}>
          {isProfitable ? "+" : ""}${totalPnL.toFixed(2)}
          <span className="pnl-percent">({isProfitable ? "+" : ""}{pnlPercent}%)</span>
        </span>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Balance</span>
          <span className="stat-value">
            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Unrealized P&L</span>
          <span className={`stat-value ${unrealizedPnl >= 0 ? "profit" : "loss"}`}>
            {unrealizedPnl >= 0 ? "+" : ""}${unrealizedPnl.toFixed(2)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Margin Used</span>
          <span className="stat-value">${marginUsed.toFixed(2)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Available</span>
          <span className="stat-value mint">${availableMargin.toFixed(2)}</span>
        </div>
      </div>

      <div className="margin-meter">
        <div className="meter-header">
          <span>Margin Usage</span>
          <span className="meter-value">{marginPercent.toFixed(1)}%</span>
        </div>
        <div className="meter-track">
          <div 
            className={`meter-fill ${marginPercent > 80 ? "danger" : marginPercent > 50 ? "warning" : ""}`}
            style={{ width: `${Math.min(marginPercent, 100)}%` }} 
          />
        </div>
      </div>

      <style jsx>{`
        .portfolio-widget {
          background: var(--surface);
          border-radius: var(--radius-lg);
          padding: 20px;
          border: 1px solid var(--border-subtle);
        }

        .widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .widget-header h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-muted);
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--text-ghost);
        }

        .status.live .status-dot {
          background: var(--mint-500);
          box-shadow: 0 0 8px var(--mint-500);
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .reset-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: var(--depth);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .reset-btn:hover {
          background: var(--abyss);
          border-color: var(--border-default);
          color: var(--text-secondary);
        }

        .equity-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 0;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: 20px;
        }

        .equity-label {
          font-size: 12px;
          color: var(--text-ghost);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .equity-value {
          font-family: var(--font-mono);
          font-size: 32px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          margin-bottom: 8px;
        }

        .pnl-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-mono);
          font-size: 14px;
          font-weight: 600;
        }

        .pnl-badge.profit {
          color: var(--profit-500);
        }

        .pnl-badge.loss {
          color: var(--loss-500);
        }

        .pnl-percent {
          opacity: 0.8;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }

        .stat-card {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px;
          background: var(--depth);
          border-radius: var(--radius-md);
        }

        .stat-label {
          font-size: 11px;
          color: var(--text-ghost);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .stat-value {
          font-family: var(--font-mono);
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .stat-value.profit {
          color: var(--profit-500);
        }

        .stat-value.loss {
          color: var(--loss-500);
        }

        .stat-value.mint {
          color: var(--mint-400);
        }

        .margin-meter {
          background: var(--depth);
          padding: 14px;
          border-radius: var(--radius-md);
        }

        .meter-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 12px;
          color: var(--text-muted);
        }

        .meter-value {
          font-family: var(--font-mono);
          font-weight: 600;
          color: var(--text-secondary);
        }

        .meter-track {
          height: 6px;
          background: var(--abyss);
          border-radius: 3px;
          overflow: hidden;
        }

        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--mint-500), var(--mint-400));
          border-radius: 3px;
          transition: width 0.4s ease;
        }

        .meter-fill.warning {
          background: linear-gradient(90deg, var(--warning-500), var(--warning-400));
        }

        .meter-fill.danger {
          background: linear-gradient(90deg, var(--loss-500), var(--loss-400));
        }
      `}</style>
    </div>
  );
}
