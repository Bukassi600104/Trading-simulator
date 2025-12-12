"use client";

import AuthModal from "@/components/AuthModal";
import Navbar from "@/components/layout/Navbar";
import { useState } from "react";

interface ChallengeData {
  phase: string;
  daysRemaining: number;
  accountBalance: number;
  currentEquity: number;
  floatingPnl: number;
  tradingDays: { current: number; required: number };
  profitTarget: { current: number; target: number };
  maxDailyLoss: { current: number; limit: number; resetsIn: string };
  maxTotalLoss: { current: number; limit: number };
  status: "active" | "passed" | "failed";
  consistencyScore: number;
}

interface Position {
  symbol: string;
  type: "BUY" | "SELL";
  volume: number;
  openPrice: number;
  currentPrice: number;
  pnl: number;
}

export default function ChallengePage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  // Mock challenge data
  const [challengeData] = useState<ChallengeData>({
    phase: "Phase 1 Evaluation",
    daysRemaining: 4,
    accountBalance: 108245.50,
    currentEquity: 109102.00,
    floatingPnl: 856.50,
    tradingDays: { current: 3, required: 5 },
    profitTarget: { current: 8000, target: 10000 },
    maxDailyLoss: { current: 2.0, limit: 5.0, resetsIn: "04:12:33" },
    maxTotalLoss: { current: 1.5, limit: 10.0 },
    status: "active",
    consistencyScore: 98,
  });

  const [positions] = useState<Position[]>([
    { symbol: "GBPUSD", type: "BUY", volume: 1.00, openPrice: 1.26450, currentPrice: 1.26800, pnl: 350.00 },
    { symbol: "XAUUSD", type: "SELL", volume: 0.50, openPrice: 2045.20, currentPrice: 2048.50, pnl: -165.00 },
    { symbol: "NAS100", type: "BUY", volume: 2.00, openPrice: 16250.00, currentPrice: 16285.40, pnl: 708.00 },
  ]);

  const profitProgress = (challengeData.profitTarget.current / challengeData.profitTarget.target) * 100;
  const dailyLossProgress = (challengeData.maxDailyLoss.current / challengeData.maxDailyLoss.limit) * 100;
  const totalLossProgress = (challengeData.maxTotalLoss.current / challengeData.maxTotalLoss.limit) * 100;

  return (
    <div className="challenge-page">
      <Navbar onOpenAuth={() => setAuthModalOpen(true)} />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <main className="challenge-content">
        {/* Challenge Header */}
        <div className="challenge-header">
          <div className="header-left">
            <div className="brand">
              <span className="brand-icon">M</span>
              <div className="brand-info">
                <span className="brand-name">Midnight Trader</span>
                <span className="connection-status">
                  <span className="status-dot"></span>
                  CONNECTED (12ms)
                </span>
              </div>
            </div>
          </div>
          
          <div className="phase-badge">
            <span className="phase-icon">🏆</span>
            <span className="phase-text">{challengeData.phase}: {challengeData.daysRemaining} Days Remaining</span>
          </div>

          <div className="header-right">
            <button className="new-order-btn">New Order</button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card large">
            <div className="stat-header">
              <span className="stat-label">Account Balance</span>
              <span className="stat-icon">💰</span>
            </div>
            <div className="stat-value">
              ${challengeData.accountBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="stat-change positive">
              ↑ +8.2%
            </div>
          </div>

          <div className="stat-card large">
            <div className="stat-header">
              <span className="stat-label">Current Equity</span>
              <span className="stat-icon">📊</span>
            </div>
            <div className="stat-value">
              ${challengeData.currentEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="stat-sub">
              Floating: <span className="positive">+${challengeData.floatingPnl.toLocaleString()}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Trading Days</span>
            </div>
            <div className="stat-value">
              {challengeData.tradingDays.current} <span className="stat-divisor">/ {challengeData.tradingDays.required}</span>
            </div>
            <div className="stat-sub">{challengeData.tradingDays.required - challengeData.tradingDays.current} days remaining</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Status</span>
            </div>
            <div className="status-active">
              <span className="status-indicator"></span>
              Active
            </div>
            <div className="stat-sub">{challengeData.phase}</div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="challenge-grid">
          {/* Profit Target */}
          <div className="panel profit-target-panel">
            <div className="panel-header">
              <h3>Profit Target</h3>
              <span className="panel-menu">⋯</span>
            </div>
            <div className="panel-body">
              <div className="circular-progress-container">
                <svg className="circular-progress" viewBox="0 0 120 120">
                  <circle
                    className="progress-bg"
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    strokeWidth="10"
                  />
                  <circle
                    className="progress-fill"
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${profitProgress * 3.27} 327`}
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="progress-center">
                  <span className="progress-value">
                    ${(challengeData.profitTarget.current / 1000).toFixed(0)},000
                  </span>
                  <span className="progress-label">
                    / ${(challengeData.profitTarget.target / 1000).toFixed(0)},000
                  </span>
                </div>
              </div>
              <div className="progress-stats">
                <span className="progress-percent">{profitProgress.toFixed(0)}% REACHED</span>
              </div>
              <div className="progress-message">
                You are ${(challengeData.profitTarget.target - challengeData.profitTarget.current).toLocaleString()} away from completing the profit target for {challengeData.phase}.
              </div>
            </div>
          </div>

          {/* Risk Management */}
          <div className="panel risk-panel">
            <div className="panel-header">
              <h3>Risk Management</h3>
              <span className="hard-limits-badge">HARD LIMITS</span>
            </div>
            <div className="panel-body">
              {/* Max Daily Loss */}
              <div className="risk-item">
                <div className="risk-header">
                  <span className="risk-label">Max Daily Loss</span>
                  <span className="risk-reset">Resets in {challengeData.maxDailyLoss.resetsIn}</span>
                </div>
                <div className="risk-values">
                  <span className="risk-current">{challengeData.maxDailyLoss.current}%</span>
                  <span className="risk-limit">/ {challengeData.maxDailyLoss.limit}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${dailyLossProgress > 80 ? "danger" : dailyLossProgress > 50 ? "warning" : ""}`}
                    style={{ width: `${dailyLossProgress}%` }}
                  />
                </div>
                <div className="risk-amounts">
                  <span>-$2,000</span>
                  <span>Limit: -$5,000</span>
                </div>
              </div>

              {/* Max Total Loss */}
              <div className="risk-item">
                <div className="risk-header">
                  <span className="risk-label">Max Total Loss</span>
                  <span className="risk-type">Trailing Drawdown</span>
                </div>
                <div className="risk-values">
                  <span className="risk-current">{challengeData.maxTotalLoss.current}%</span>
                  <span className="risk-limit">/ {challengeData.maxTotalLoss.limit}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${totalLossProgress > 80 ? "danger" : totalLossProgress > 50 ? "warning" : ""}`}
                    style={{ width: `${totalLossProgress}%` }}
                  />
                </div>
                <div className="risk-amounts">
                  <span>-$1,500</span>
                  <span>Limit: -$10,000</span>
                </div>
              </div>

              {/* Risk Warning */}
              <div className="risk-warning">
                <span className="warning-icon">⚠️</span>
                <div className="warning-content">
                  <span className="warning-title">Risk Warning</span>
                  <span className="warning-text">Approaching daily loss limit on open positions. Consider hedging or closing risk.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trading Objectives */}
          <div className="panel objectives-panel">
            <div className="panel-header">
              <h3>Trading Objectives</h3>
            </div>
            <div className="panel-body">
              <div className="objective-item complete">
                <span className="objective-icon">✓</span>
                <div className="objective-content">
                  <span className="objective-title">Minimum Trading Days</span>
                  <span className="objective-status">Current: {challengeData.tradingDays.current} / Target: {challengeData.tradingDays.required}</span>
                </div>
              </div>

              <div className="objective-item incomplete">
                <span className="objective-icon">✕</span>
                <div className="objective-content">
                  <span className="objective-title">Profit Target Reached</span>
                  <span className="objective-status">Current: ${challengeData.profitTarget.current.toLocaleString()} / Target: ${challengeData.profitTarget.target.toLocaleString()}</span>
                </div>
              </div>

              <div className="objective-item complete">
                <span className="objective-icon">✓</span>
                <div className="objective-content">
                  <span className="objective-title">No Weekend Holding</span>
                  <span className="objective-status">All positions closed before Fri 21:00</span>
                </div>
              </div>

              <div className="consistency-section">
                <span className="consistency-label">Consistency Score</span>
                <span className="consistency-value">{challengeData.consistencyScore}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Open Positions */}
        <div className="positions-section">
          <div className="section-header">
            <div className="header-left">
              <h3>Open Positions</h3>
              <span className="positions-count">{positions.length} Active</span>
            </div>
            <div className="header-actions">
              <button className="action-btn">History</button>
              <button className="action-btn danger">Close All</button>
            </div>
          </div>

          <table className="positions-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Type</th>
                <th>Volume</th>
                <th>Open Price</th>
                <th>Current Price</th>
                <th>P&L</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos, i) => (
                <tr key={i}>
                  <td className="symbol-cell">
                    <span className="symbol-icon">{pos.symbol.charAt(0)}</span>
                    {pos.symbol}
                  </td>
                  <td className={pos.type === "BUY" ? "buy" : "sell"}>{pos.type}</td>
                  <td>{pos.volume.toFixed(2)}</td>
                  <td>{pos.openPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td>{pos.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className={pos.pnl >= 0 ? "profit" : "loss"}>
                    {pos.pnl >= 0 ? "+" : ""}${Math.abs(pos.pnl).toFixed(2)}
                  </td>
                  <td>
                    <button className="close-position-btn">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="page-footer">
          <span>Market Data is delayed by 15ms</span>
          <span className="footer-right">
            Server: MT-NorthAmerica-1 <span className="status-dot green"></span> Operational
          </span>
        </div>
      </main>

      <style jsx>{`
        .challenge-page {
          min-height: 100vh;
          background: #0F172A;
        }

        .challenge-content {
          max-width: 1600px;
          margin: 0 auto;
          padding: 24px;
        }

        /* Header */
        .challenge-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid #334155;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #10B981, #059669);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 20px;
          color: white;
        }

        .brand-info {
          display: flex;
          flex-direction: column;
        }

        .brand-name {
          font-size: 16px;
          font-weight: 600;
          color: #F1F5F9;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #10B981;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          background: #10B981;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .phase-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 20px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 30px;
        }

        .phase-icon {
          font-size: 18px;
        }

        .phase-text {
          font-size: 14px;
          font-weight: 600;
          color: #10B981;
        }

        .new-order-btn {
          padding: 10px 24px;
          background: #3B82F6;
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .new-order-btn:hover {
          background: #2563EB;
        }

        /* Stats Row */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: #1E293B;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #334155;
        }

        .stat-card.large {
          padding: 24px;
        }

        .stat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .stat-label {
          font-size: 13px;
          color: #64748B;
        }

        .stat-icon {
          width: 36px;
          height: 36px;
          background: #334155;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #F1F5F9;
          font-family: 'JetBrains Mono', monospace;
        }

        .stat-divisor {
          font-size: 18px;
          color: #64748B;
        }

        .stat-change {
          font-size: 13px;
          font-weight: 600;
          margin-top: 4px;
        }

        .stat-change.positive {
          color: #10B981;
        }

        .stat-sub {
          font-size: 12px;
          color: #64748B;
          margin-top: 4px;
        }

        .stat-sub .positive {
          color: #10B981;
        }

        .status-active {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 600;
          color: #10B981;
        }

        .status-indicator {
          width: 10px;
          height: 10px;
          background: #10B981;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        /* Main Grid */
        .challenge-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .panel {
          background: #1E293B;
          border-radius: 16px;
          border: 1px solid #334155;
          overflow: hidden;
        }

        .panel-header {
          padding: 16px 20px;
          border-bottom: 1px solid #334155;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .panel-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #F1F5F9;
          margin: 0;
        }

        .panel-menu {
          color: #64748B;
          cursor: pointer;
        }

        .panel-body {
          padding: 20px;
        }

        /* Profit Target */
        .circular-progress-container {
          position: relative;
          width: 160px;
          height: 160px;
          margin: 0 auto 20px;
        }

        .circular-progress {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .progress-bg {
          stroke: #334155;
        }

        .progress-fill {
          stroke: #10B981;
          transition: stroke-dasharray 0.5s ease;
        }

        .progress-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .progress-value {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: #F1F5F9;
          font-family: 'JetBrains Mono', monospace;
        }

        .progress-label {
          display: block;
          font-size: 12px;
          color: #64748B;
        }

        .progress-stats {
          text-align: center;
          margin-bottom: 16px;
        }

        .progress-percent {
          font-size: 14px;
          font-weight: 600;
          color: #10B981;
        }

        .progress-message {
          font-size: 13px;
          color: #94A3B8;
          text-align: center;
          line-height: 1.5;
        }

        /* Risk Panel */
        .hard-limits-badge {
          padding: 4px 12px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
          color: #EF4444;
          letter-spacing: 0.5px;
        }

        .risk-item {
          padding: 16px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .risk-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .risk-label {
          font-size: 13px;
          color: #94A3B8;
        }

        .risk-reset,
        .risk-type {
          font-size: 11px;
          color: #64748B;
        }

        .risk-values {
          margin-bottom: 10px;
        }

        .risk-current {
          font-size: 22px;
          font-weight: 700;
          color: #F1F5F9;
        }

        .risk-limit {
          font-size: 14px;
          color: #64748B;
        }

        .progress-bar {
          height: 8px;
          background: #334155;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-bar .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10B981, #34D399);
          transition: width 0.5s ease;
        }

        .progress-bar .progress-fill.warning {
          background: linear-gradient(90deg, #F59E0B, #FBBF24);
        }

        .progress-bar .progress-fill.danger {
          background: linear-gradient(90deg, #EF4444, #F87171);
        }

        .risk-amounts {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #64748B;
        }

        .risk-warning {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 12px;
        }

        .warning-icon {
          font-size: 20px;
        }

        .warning-content {
          display: flex;
          flex-direction: column;
        }

        .warning-title {
          font-size: 13px;
          font-weight: 600;
          color: #F59E0B;
          margin-bottom: 4px;
        }

        .warning-text {
          font-size: 12px;
          color: #94A3B8;
          line-height: 1.4;
        }

        /* Objectives Panel */
        .objective-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(51, 65, 85, 0.5);
        }

        .objective-item:last-of-type {
          border-bottom: none;
        }

        .objective-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
        }

        .objective-item.complete .objective-icon {
          background: rgba(16, 185, 129, 0.2);
          color: #10B981;
        }

        .objective-item.incomplete .objective-icon {
          background: rgba(239, 68, 68, 0.2);
          color: #EF4444;
        }

        .objective-content {
          flex: 1;
        }

        .objective-title {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #F1F5F9;
          margin-bottom: 2px;
        }

        .objective-status {
          font-size: 11px;
          color: #64748B;
        }

        .consistency-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #334155;
        }

        .consistency-label {
          font-size: 13px;
          color: #94A3B8;
        }

        .consistency-value {
          font-size: 24px;
          font-weight: 700;
          color: #10B981;
          font-family: 'JetBrains Mono', monospace;
        }

        /* Positions Section */
        .positions-section {
          background: #1E293B;
          border-radius: 16px;
          border: 1px solid #334155;
          overflow: hidden;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #334155;
        }

        .section-header .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .section-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #F1F5F9;
          margin: 0;
        }

        .positions-count {
          padding: 4px 10px;
          background: #334155;
          border-radius: 20px;
          font-size: 12px;
          color: #94A3B8;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          padding: 8px 16px;
          background: #334155;
          border: 1px solid #475569;
          border-radius: 8px;
          color: #F1F5F9;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: #475569;
        }

        .action-btn.danger {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.3);
          color: #EF4444;
        }

        .positions-table {
          width: 100%;
          border-collapse: collapse;
        }

        .positions-table th {
          padding: 12px 20px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: rgba(0, 0, 0, 0.2);
        }

        .positions-table td {
          padding: 16px 20px;
          font-size: 13px;
          color: #94A3B8;
          border-bottom: 1px solid rgba(51, 65, 85, 0.5);
        }

        .symbol-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 500;
          color: #F1F5F9;
        }

        .symbol-icon {
          width: 28px;
          height: 28px;
          background: #334155;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
        }

        .buy {
          color: #10B981;
          font-weight: 600;
        }

        .sell {
          color: #EF4444;
          font-weight: 600;
        }

        .profit {
          color: #10B981;
          font-weight: 600;
        }

        .loss {
          color: #EF4444;
          font-weight: 600;
        }

        .close-position-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: transparent;
          border: 1px solid #475569;
          color: #94A3B8;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .close-position-btn:hover {
          background: rgba(239, 68, 68, 0.15);
          border-color: #EF4444;
          color: #EF4444;
        }

        /* Footer */
        .page-footer {
          display: flex;
          justify-content: space-between;
          padding: 16px 0;
          font-size: 12px;
          color: #64748B;
          border-top: 1px solid #334155;
          margin-top: 24px;
        }

        .footer-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot.green {
          display: inline-block;
          width: 8px;
          height: 8px;
          background: #10B981;
          border-radius: 50%;
        }

        @media (max-width: 1200px) {
          .challenge-grid {
            grid-template-columns: 1fr 1fr;
          }

          .objectives-panel {
            grid-column: span 2;
          }
        }

        @media (max-width: 900px) {
          .stats-row {
            grid-template-columns: 1fr 1fr;
          }

          .challenge-grid {
            grid-template-columns: 1fr;
          }

          .objectives-panel {
            grid-column: span 1;
          }

          .phase-badge {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
