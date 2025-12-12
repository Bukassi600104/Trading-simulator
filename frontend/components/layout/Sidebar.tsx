/**
 * Sidebar Component - Terminal Zero
 * Quick access to trading pairs and chart tools
 */

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface SidebarProps {
  collapsed?: boolean;
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const searchParams = useSearchParams();
  const currentSymbol = searchParams.get("symbol") || "BTC-USDT";

  const tradingPairs = [
    { symbol: "BTC-USDT", icon: "₿", label: "Bitcoin", color: "#f7931a" },
    { symbol: "ETH-USDT", icon: "Ξ", label: "Ethereum", color: "#627eea" },
    { symbol: "SOL-USDT", icon: "◎", label: "Solana", color: "#00ffa3" },
  ];

  const chartTools = [
    { 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ), 
      label: "Indicators" 
    },
    { 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="20" x2="20" y2="4" />
        </svg>
      ), 
      label: "Trend Line" 
    },
    { 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      ), 
      label: "Fib Retracement" 
    },
    { 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7V4h16v3M9 20h6M12 4v16" />
        </svg>
      ), 
      label: "Text Note" 
    },
  ];

  return (
    <aside className="sidebar">
      {/* Trading Pairs */}
      <div className="sidebar-group">
        <span className="group-label">Markets</span>
        {tradingPairs.map((pair) => (
          <Link
            key={pair.symbol}
            href={`/trade?symbol=${pair.symbol}`}
            className={`sidebar-item ${currentSymbol === pair.symbol ? "active" : ""}`}
            title={pair.label}
          >
            <span className="item-icon" style={{ color: pair.color }}>{pair.icon}</span>
            {!collapsed && <span className="item-symbol">{pair.symbol.split("-")[0]}</span>}
          </Link>
        ))}
      </div>

      {/* Divider */}
      <div className="divider" />

      {/* Chart Tools */}
      <div className="sidebar-group">
        <span className="group-label">Tools</span>
        {chartTools.map((tool, index) => (
          <button
            key={index}
            className="sidebar-item"
            title={tool.label}
          >
            <span className="item-icon">{tool.icon}</span>
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="spacer" />

      {/* Add Symbol */}
      <button className="add-btn" title="Add Symbol">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <style jsx>{`
        .sidebar {
          width: 56px;
          background: var(--surface);
          border-right: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 14px 8px;
          gap: 6px;
        }

        .sidebar-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          width: 100%;
        }

        .group-label {
          font-size: 9px;
          font-weight: 600;
          color: var(--text-ghost);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .sidebar-item {
          width: 40px;
          height: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          border-radius: var(--radius-md);
          color: var(--text-muted);
          text-decoration: none;
          cursor: pointer;
          border: none;
          background: transparent;
          transition: all var(--transition-fast);
        }

        .sidebar-item:hover {
          background: var(--depth);
          color: var(--text-secondary);
        }

        .sidebar-item.active {
          background: linear-gradient(135deg, var(--mint-500), var(--mint-600));
          color: var(--void);
        }

        .sidebar-item.active .item-icon {
          color: var(--void) !important;
        }

        .item-icon {
          font-size: 16px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .item-symbol {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.3px;
        }

        .divider {
          width: 28px;
          height: 1px;
          background: var(--border-subtle);
          margin: 8px 0;
        }

        .spacer {
          flex: 1;
        }

        .add-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
          background: transparent;
          border: 1px dashed var(--border-default);
          color: var(--text-ghost);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .add-btn:hover {
          border-color: var(--mint-500);
          border-style: solid;
          color: var(--mint-400);
          background: var(--mint-glow);
        }
      `}</style>
    </aside>
  );
}
