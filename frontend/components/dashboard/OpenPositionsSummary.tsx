"use client";

interface Position {
  symbol: string;
  type: "LONG" | "SHORT";
  size: number;
  entryPrice: number;
  currentPrice: number;
}

interface OpenPositionsSummaryProps {
  positions?: Position[];
}

export default function OpenPositionsSummary({ positions }: OpenPositionsSummaryProps) {
  // Mock data if none provided
  const positionData: Position[] = positions || [
    { symbol: "BTC/USD", type: "LONG", size: 1.5, entryPrice: 34200.50, currentPrice: 34890.00 },
    { symbol: "ETH/USDT", type: "SHORT", size: 12.0, entryPrice: 1850.20, currentPrice: 1830.00 },
    { symbol: "XAU/USD", type: "LONG", size: 5.0, entryPrice: 1980.10, currentPrice: 1975.50 },
  ];

  return (
    <div className="open-positions-summary">
      <div className="header">
        <h3>Open Positions</h3>
        <a href="/trade" className="view-all">VIEW ALL</a>
      </div>

      <div className="positions-table">
        <div className="table-header">
          <span className="col-symbol">SYMBOL</span>
          <span className="col-type">TYPE</span>
          <span className="col-size">SIZE</span>
          <span className="col-entry">ENTRY</span>
          <span className="col-current">CURRENT</span>
        </div>

        <div className="table-body">
          {positionData.map((position, index) => (
            <div key={index} className="position-row">
              <div className="col-symbol">
                <span className="symbol-icon">{getSymbolIcon(position.symbol)}</span>
                <span className="symbol-name">{position.symbol}</span>
              </div>
              <div className={`col-type ${position.type.toLowerCase()}`}>
                {position.type}
              </div>
              <div className="col-size">{position.size.toFixed(2)}</div>
              <div className="col-entry">{position.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="col-current">{position.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .open-positions-summary {
          background: #1E293B;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #334155;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        h3 {
          font-size: 16px;
          font-weight: 600;
          color: #F1F5F9;
        }

        .view-all {
          font-size: 12px;
          color: #3B82F6;
          text-decoration: none;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .view-all:hover {
          color: #60A5FA;
        }

        .positions-table {
          overflow-x: auto;
        }

        .table-header {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.5fr 1.5fr;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid #334155;
          font-size: 11px;
          color: #64748B;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .table-body {
          display: flex;
          flex-direction: column;
        }

        .position-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.5fr 1.5fr;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(51, 65, 85, 0.5);
          align-items: center;
        }

        .position-row:last-child {
          border-bottom: none;
        }

        .col-symbol {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .symbol-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }

        .symbol-name {
          font-size: 13px;
          font-weight: 500;
          color: #F1F5F9;
        }

        .col-type {
          font-size: 12px;
          font-weight: 600;
        }

        .col-type.long {
          color: #10B981;
        }

        .col-type.short {
          color: #EF4444;
        }

        .col-size,
        .col-entry,
        .col-current {
          font-size: 13px;
          font-family: 'JetBrains Mono', monospace;
          color: #94A3B8;
        }
      `}</style>
    </div>
  );
}

function getSymbolIcon(symbol: string): string {
  if (symbol.includes("BTC")) return "₿";
  if (symbol.includes("ETH")) return "Ξ";
  if (symbol.includes("XAU")) return "✕";
  if (symbol.includes("SOL")) return "◎";
  return symbol.charAt(0);
}
