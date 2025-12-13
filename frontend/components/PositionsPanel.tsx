/**
 * PositionsPanel Component - Terminal Zero
 * Real-time open positions display with close functionality
 */

"use client";

import { API_BASE, WS_BASE } from "@/lib/runtimeConfig";
import { useCallback, useEffect, useRef, useState } from "react";

interface Position {
  symbol: string;
  side: "LONG" | "SHORT" | "FLAT";
  qty: number;
  entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  roi_percent: number;
  leverage: number;
  margin_used: number;
}

interface Portfolio {
  balance: number;
  equity: number;
  total_margin_used: number;
  available_margin: number;
  total_unrealized_pnl: number;
  positions: Record<string, Position>;
}

interface PositionsPanelProps {
  onClose?: (symbol: string) => void;
}

export default function PositionsPanel({ onClose }: PositionsPanelProps) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closingSymbol, setClosingSymbol] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef<boolean>(true);

  const connectWebSocket = useCallback(() => {
    const ws = new WebSocket(`${WS_BASE}/ws/portfolio`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setConnected(true);
      setError(null);
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

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setError("Connection error");
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      setTimeout(() => {
        if (mountedRef.current && wsRef.current?.readyState === WebSocket.CLOSED) {
          connectWebSocket();
        }
      }, 3000);
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connectWebSocket();

    return () => {
      mountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectWebSocket]);

  const handleClosePosition = async (symbol: string) => {
    setClosingSymbol(symbol);
    try {
      const response = await fetch(`${API_BASE}/api/trading/positions/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.detail || "Failed to close position");
      }

      onClose?.(symbol);
    } catch (err) {
      console.error("Failed to close position:", err);
    } finally {
      setClosingSymbol(null);
    }
  };

  const openPositions = portfolio
    ? Object.values(portfolio.positions).filter((p) => p.side !== "FLAT" && p.qty > 0)
    : [];

  return (
    <div className="positions-panel">
      <header className="panel-header">
        <h3>Open Positions</h3>
        <div className={`connection-badge ${connected ? "connected" : "disconnected"}`}>
          <span className="badge-dot" />
          {connected ? "Live" : "Offline"}
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {openPositions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          </div>
          <p>No open positions</p>
          <span>Your active trades will appear here</span>
        </div>
      ) : (
        <div className="positions-grid">
          {openPositions.map((position) => {
            const qty = parseFloat(String(position.qty)) || 0;
            const entryPrice = parseFloat(String(position.entry_price)) || 0;
            const currentPrice = parseFloat(String(position.current_price)) || 0;
            const marginUsed = parseFloat(String(position.margin_used)) || 0;
            const unrealizedPnl = parseFloat(String(position.unrealized_pnl)) || 0;
            const roiPercent = parseFloat(String(position.roi_percent)) || 0;
            const leverage = parseFloat(String(position.leverage)) || 1;
            const isProfit = unrealizedPnl >= 0;
            const isClosing = closingSymbol === position.symbol;

            return (
              <article key={position.symbol} className="position-card">
                <div className="card-header">
                  <div className="symbol-group">
                    <span className="symbol-icon">
                      {position.symbol.startsWith("BTC") ? "₿" : 
                       position.symbol.startsWith("ETH") ? "Ξ" : "◆"}
                    </span>
                    <span className="symbol-name">{position.symbol.replace("-", "/")}</span>
                    <span className={`side-tag ${position.side.toLowerCase()}`}>
                      {position.side}
                    </span>
                  </div>
                  <span className="leverage-tag">{leverage}×</span>
                </div>

                <div className="card-body">
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Size</span>
                      <span className="detail-value">{qty.toFixed(4)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Entry</span>
                      <span className="detail-value">${entryPrice.toLocaleString()}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Mark</span>
                      <span className="detail-value">${currentPrice.toLocaleString()}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Margin</span>
                      <span className="detail-value">${marginUsed.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className={`pnl-display ${isProfit ? "profit" : "loss"}`}>
                    <span className="pnl-amount">
                      {isProfit ? "+" : ""}${unrealizedPnl.toFixed(2)}
                    </span>
                    <span className="pnl-percent">
                      {roiPercent >= 0 ? "+" : ""}{roiPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <button
                  className={`close-button ${isClosing ? "closing" : ""}`}
                  onClick={() => handleClosePosition(position.symbol)}
                  disabled={isClosing}
                >
                  {isClosing ? (
                    <>
                      <span className="spinner" />
                      Closing...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Close Position
                    </>
                  )}
                </button>
              </article>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .positions-panel {
          background: var(--surface);
          border-radius: var(--radius-lg);
          padding: 20px;
          border: 1px solid var(--border-subtle);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }

        .connection-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 500;
        }

        .connection-badge.connected {
          background: var(--mint-glow);
          color: var(--mint-400);
        }

        .connection-badge.disconnected {
          background: rgba(239, 68, 68, 0.1);
          color: var(--loss-400);
        }

        .badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .connection-badge.connected .badge-dot {
          box-shadow: 0 0 6px var(--mint-500);
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: var(--loss-400);
          padding: 12px 14px;
          border-radius: var(--radius-md);
          margin-bottom: 16px;
          font-size: 13px;
        }

        .empty-state {
          text-align: center;
          padding: 48px 20px;
        }

        .empty-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          background: var(--depth);
          border-radius: var(--radius-lg);
          color: var(--text-ghost);
          margin-bottom: 16px;
        }

        .empty-state p {
          margin: 0 0 4px;
          font-size: 15px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .empty-state span {
          font-size: 13px;
          color: var(--text-ghost);
        }

        .positions-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .position-card {
          background: var(--depth);
          border-radius: var(--radius-lg);
          padding: 16px;
          border: 1px solid var(--border-subtle);
          transition: border-color var(--transition-fast);
        }

        .position-card:hover {
          border-color: var(--border-default);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .symbol-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .symbol-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--abyss);
          border-radius: var(--radius-md);
          font-size: 14px;
          color: var(--text-secondary);
        }

        .symbol-name {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary);
        }

        .side-tag {
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .side-tag.long {
          background: var(--profit-glow);
          color: var(--profit-500);
        }

        .side-tag.short {
          background: var(--loss-glow);
          color: var(--loss-500);
        }

        .leverage-tag {
          padding: 4px 8px;
          background: var(--abyss);
          border-radius: var(--radius-sm);
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 600;
          color: var(--mint-400);
        }

        .card-body {
          margin-bottom: 14px;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 14px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .detail-label {
          font-size: 12px;
          color: var(--text-ghost);
        }

        .detail-value {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .pnl-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 14px;
          background: var(--abyss);
          border-radius: var(--radius-md);
        }

        .pnl-display.profit {
          background: var(--profit-glow);
        }

        .pnl-display.loss {
          background: var(--loss-glow);
        }

        .pnl-amount {
          font-family: var(--font-mono);
          font-size: 18px;
          font-weight: 700;
        }

        .pnl-percent {
          font-family: var(--font-mono);
          font-size: 14px;
          font-weight: 500;
          opacity: 0.85;
        }

        .pnl-display.profit .pnl-amount,
        .pnl-display.profit .pnl-percent {
          color: var(--profit-500);
        }

        .pnl-display.loss .pnl-amount,
        .pnl-display.loss .pnl-percent {
          color: var(--loss-500);
        }

        .close-button {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          background: transparent;
          border: 1px solid var(--loss-500);
          border-radius: var(--radius-md);
          color: var(--loss-500);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .close-button:hover:not(:disabled) {
          background: var(--loss-500);
          color: white;
        }

        .close-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .close-button.closing {
          background: var(--loss-glow);
          border-color: transparent;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid transparent;
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
