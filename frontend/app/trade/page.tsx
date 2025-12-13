"use client";

import AuthModal from "@/components/AuthModal";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import OrderPanel from "@/components/OrderPanel";
import StreamingChart from "@/components/StreamingChart";
import { useAuthStore } from "@/stores/authStore";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function TradePageInner() {
  const searchParams = useSearchParams();
  const symbolParam = searchParams.get("symbol") || "BTC-USDT";
  
  const [symbol] = useState(symbolParam);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"positions" | "pending" | "history" | "journal">("positions");
  const [isLoaded, setIsLoaded] = useState(false);

  const { checkAuth } = useAuthStore();

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const isValid = await checkAuth();
      if (!isValid) {
        setAuthModalOpen(true);
      }
    };
    initAuth();
  }, [checkAuth]);

  // Convert symbol for WebSocket (BTC-USDT -> BTCUSDT)
  const wsSymbol = symbol.replace("-", "");

  // Loading state
  if (!isLoaded) {
    return (
      <div className="loading-screen">
        <div className="t0-spinner" />
      </div>
    );
  }

  return (
    <div className="trade-page">
      <Navbar onOpenAuth={() => setAuthModalOpen(true)} />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <div className="trade-layout">
        {/* Left Sidebar - Symbol Selection */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="main-content">
          {/* Chart Area */}
          <section className="chart-section">
            {/* Chart Header */}
            <header className="chart-header">
              <div className="header-left">
                <div className="symbol-badge">
                  <span className="symbol-icon">₿</span>
                  <span className="symbol-name">{symbol}</span>
                  {currentPrice && (
                    <span className="price-tag profit">+2.45%</span>
                  )}
                </div>
              </div>

              <div className="timeframes">
                {["1m", "5m", "15m", "1H", "4H", "1D"].map((tf) => (
                  <button
                    key={tf}
                    className={`tf-btn ${tf === "1H" ? "active" : ""}`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              <div className="chart-tools">
                <button className="tool-btn" title="Indicators">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3v18h18" /><path d="M18 9l-5 5-4-4-3 3" />
                  </svg>
                </button>
                <button className="tool-btn" title="Draw">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                  </svg>
                </button>
                <button className="tool-btn" title="Settings">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
              </div>
            </header>

            {/* Chart Component */}
            <div className="chart-container">
              <StreamingChart
                symbol={wsSymbol}
                onPriceUpdate={setCurrentPrice}
              />

              {/* Bar Replay Controls */}
              <div className="replay-bar">
                <button className="replay-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" />
                  </svg>
                </button>
                <button className="replay-btn primary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </button>
                <button className="replay-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" />
                  </svg>
                </button>
                <div className="speed-control">
                  <span className="speed-value">1x</span>
                </div>
              </div>
            </div>
          </section>

          {/* Bottom Panel - Positions & History */}
          <section className="bottom-panel">
            <div className="panel-header">
              <nav className="panel-tabs">
                <button
                  className={`tab ${activeTab === "positions" ? "active" : ""}`}
                  onClick={() => setActiveTab("positions")}
                >
                  <span>Positions</span>
                  <span className="tab-count">3</span>
                </button>
                <button
                  className={`tab ${activeTab === "pending" ? "active" : ""}`}
                  onClick={() => setActiveTab("pending")}
                >
                  Pending
                </button>
                <button
                  className={`tab ${activeTab === "history" ? "active" : ""}`}
                  onClick={() => setActiveTab("history")}
                >
                  History
                </button>
                <button
                  className={`tab ${activeTab === "journal" ? "active" : ""}`}
                  onClick={() => setActiveTab("journal")}
                >
                  Journal
                </button>
              </nav>

              <div className="panel-actions">
                <button className="action-btn ghost">Edit TP/SL</button>
                <button className="action-btn danger">Close All</button>
              </div>
            </div>

            <div className="panel-body">
              {activeTab === "positions" && <PositionsTable />}
              {activeTab === "pending" && (
                <div className="empty-state">
                  <span className="empty-icon">📋</span>
                  <span>No pending orders</span>
                </div>
              )}
              {activeTab === "history" && (
                <div className="empty-state">
                  <span className="empty-icon">📜</span>
                  <span>No trade history yet</span>
                </div>
              )}
              {activeTab === "journal" && (
                <div className="empty-state">
                  <span className="empty-icon">📓</span>
                  <span>Start journaling your trades</span>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* Right Sidebar - Order Panel */}
        <aside className="order-sidebar">
          <OrderPanel symbol={symbol} currentPrice={currentPrice} />
        </aside>
      </div>

      <style jsx>{`
        /* ═══════════════════════════════════════════════════════════════
           TRADE PAGE - Terminal Zero Theme
           ═══════════════════════════════════════════════════════════════ */

        .loading-screen {
          min-height: 100vh;
          background: var(--void);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .trade-page {
          min-height: 100vh;
          background: var(--void);
          display: flex;
          flex-direction: column;
        }

        .trade-layout {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        /* ═══════════════════════════════════════════════════════════════
           MAIN CONTENT
           ═══════════════════════════════════════════════════════════════ */
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          background: var(--abyss);
        }

        /* ═══════════════════════════════════════════════════════════════
           CHART SECTION
           ═══════════════════════════════════════════════════════════════ */
        .chart-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 400px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .chart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 16px;
          background: var(--surface);
          border-bottom: 1px solid var(--border-subtle);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .symbol-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          background: var(--depth);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
        }

        .symbol-icon {
          font-size: 16px;
          color: var(--mint-400);
        }

        .symbol-name {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.3px;
        }

        .price-tag {
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: var(--radius-sm);
        }

        .price-tag.profit {
          background: var(--profit-glow);
          color: var(--profit-400);
        }

        .price-tag.loss {
          background: var(--loss-glow);
          color: var(--loss-400);
        }

        .timeframes {
          display: flex;
          gap: 2px;
          padding: 4px;
          background: var(--depth);
          border-radius: var(--radius-md);
        }

        .tf-btn {
          padding: 6px 12px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 600;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .tf-btn:hover {
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.03);
        }

        .tf-btn.active {
          background: var(--mint-500);
          color: var(--void);
        }

        .chart-tools {
          display: flex;
          gap: 6px;
        }

        .tool-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--depth);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-muted);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .tool-btn:hover {
          border-color: var(--border-default);
          color: var(--mint-400);
        }

        .chart-container {
          flex: 1;
          position: relative;
          background: var(--surface);
        }

        /* Replay Bar */
        .replay-bar {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: rgba(10, 15, 25, 0.9);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-full);
          backdrop-filter: blur(12px);
        }

        .replay-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--depth);
          border: 1px solid var(--border-subtle);
          border-radius: 50%;
          color: var(--text-muted);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .replay-btn:hover {
          border-color: var(--mint-500);
          color: var(--mint-400);
        }

        .replay-btn.primary {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, var(--mint-500), var(--mint-600));
          border: none;
          color: var(--void);
        }

        .replay-btn.primary:hover {
          box-shadow: 0 4px 16px rgba(0, 230, 160, 0.3);
        }

        .speed-control {
          margin-left: 8px;
          padding-left: 12px;
          border-left: 1px solid var(--border-subtle);
        }

        .speed-value {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        /* ═══════════════════════════════════════════════════════════════
           BOTTOM PANEL
           ═══════════════════════════════════════════════════════════════ */
        .bottom-panel {
          height: 260px;
          background: var(--surface);
          display: flex;
          flex-direction: column;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .panel-tabs {
          display: flex;
          gap: 4px;
          padding: 12px 0;
        }

        .tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: transparent;
          border: none;
          border-radius: var(--radius-md);
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .tab:hover {
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.03);
        }

        .tab.active {
          color: var(--text-primary);
          background: var(--depth);
        }

        .tab-count {
          padding: 2px 7px;
          background: var(--mint-500);
          color: var(--void);
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 700;
        }

        .panel-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          padding: 7px 14px;
          background: var(--depth);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .action-btn:hover {
          border-color: var(--border-default);
        }

        .action-btn.ghost {
          background: transparent;
        }

        .action-btn.danger {
          background: var(--loss-glow);
          border-color: rgba(239, 68, 68, 0.3);
          color: var(--loss-400);
        }

        .action-btn.danger:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        .panel-body {
          flex: 1;
          overflow: auto;
        }

        .empty-state {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: var(--text-ghost);
          font-size: 14px;
        }

        .empty-icon {
          font-size: 24px;
          opacity: 0.5;
        }

        /* ═══════════════════════════════════════════════════════════════
           ORDER SIDEBAR
           ═══════════════════════════════════════════════════════════════ */
        .order-sidebar {
          width: 340px;
          background: var(--surface);
          border-left: 1px solid var(--border-subtle);
          overflow-y: auto;
        }

        /* ═══════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════ */
        @media (max-width: 1280px) {
          .order-sidebar {
            width: 300px;
          }
        }

        @media (max-width: 1024px) {
          .trade-layout {
            flex-direction: column;
          }

          .order-sidebar {
            width: 100%;
            border-left: none;
            border-top: 1px solid var(--border-subtle);
            max-height: 400px;
          }
        }

        @media (max-width: 768px) {
          .chart-header {
            flex-wrap: wrap;
            gap: 12px;
          }

          .timeframes {
            order: 3;
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

export default function TradePage() {
  return (
    <Suspense fallback={<div className="loading-screen"><div className="t0-spinner" /></div>}>
      <TradePageInner />
    </Suspense>
  );
}

/* ═══════════════════════════════════════════════════════════════
   POSITIONS TABLE COMPONENT
   ═══════════════════════════════════════════════════════════════ */
function PositionsTable() {
  const mockPositions = [
    { symbol: "BTC/USDT", side: "Long", size: "0.158 BTC", entry: "65,230.50", mark: "67,420.00", liq: "58,100.00", pnl: "+$328.42", roe: "+3.35%" },
    { symbol: "ETH/USDT", side: "Short", size: "2.50 ETH", entry: "3,540.00", mark: "3,560.00", liq: "3,800.00", pnl: "-$50.00", roe: "-0.56%" },
    { symbol: "SOL/USDT", side: "Long", size: "50.0 SOL", entry: "132.50", mark: "145.20", liq: "110.00", pnl: "+$635.00", roe: "+1.58%" },
  ];

  return (
    <div className="positions-table-wrapper">
      <table className="positions-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Side</th>
            <th>Size</th>
            <th>Entry</th>
            <th>Mark</th>
            <th>Liq.</th>
            <th>PnL (ROE)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {mockPositions.map((pos, i) => (
            <tr key={i}>
              <td className="cell-symbol">{pos.symbol}</td>
              <td>
                <span className={`side-badge ${pos.side.toLowerCase()}`}>
                  {pos.side}
                </span>
              </td>
              <td className="cell-mono">{pos.size}</td>
              <td className="cell-mono">{pos.entry}</td>
              <td className="cell-mono">{pos.mark}</td>
              <td className="cell-mono cell-dim">{pos.liq}</td>
              <td>
                <div className="pnl-cell">
                  <span className={pos.pnl.startsWith("+") ? "profit" : "loss"}>
                    {pos.pnl}
                  </span>
                  <span className={`roe ${pos.roe.startsWith("+") ? "profit" : "loss"}`}>
                    {pos.roe}
                  </span>
                </div>
              </td>
              <td>
                <button className="close-position-btn" title="Close Position">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <style jsx>{`
        .positions-table-wrapper {
          overflow-x: auto;
        }

        .positions-table {
          width: 100%;
          border-collapse: collapse;
        }

        .positions-table th {
          padding: 12px 16px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-ghost);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: var(--depth);
          border-bottom: 1px solid var(--border-subtle);
        }

        .positions-table td {
          padding: 14px 16px;
          font-size: 13px;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border-subtle);
        }

        .positions-table tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .cell-symbol {
          font-weight: 600;
          color: var(--text-primary);
        }

        .cell-mono {
          font-family: var(--font-mono);
        }

        .cell-dim {
          color: var(--text-muted);
        }

        .side-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .side-badge.long {
          background: var(--profit-glow);
          color: var(--profit-400);
        }

        .side-badge.short {
          background: var(--loss-glow);
          color: var(--loss-400);
        }

        .pnl-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .pnl-cell .profit {
          font-family: var(--font-mono);
          font-weight: 600;
          color: var(--profit-400);
        }

        .pnl-cell .loss {
          font-family: var(--font-mono);
          font-weight: 600;
          color: var(--loss-400);
        }

        .roe {
          font-size: 11px;
          opacity: 0.8;
        }

        .close-position-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .close-position-btn:hover {
          background: var(--loss-glow);
          border-color: var(--loss-400);
          color: var(--loss-400);
        }
      `}</style>
    </div>
  );
}
