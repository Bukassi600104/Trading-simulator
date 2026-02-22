/**
 * ChallengeGauge — Prop Mode Dashboard Widget
 *
 * Displays real-time progress bars for:
 *  - Daily Loss Limit (how close the user is to breaching their daily drawdown limit)
 *  - Profit Target (progress toward the challenge's profit goal)
 *
 * Flashes red borders when drawdown approaches the limit.
 */

'use client';

import { useEffect, useState } from 'react';

interface ChallengeGaugeProps {
  /** Account equity as a number (e.g. 10500.00 for a $10k account at +5%) */
  equity: number;
  /** Starting balance of the challenge (e.g. 10000) */
  startBalance: number;
  /** Daily drawdown limit as a decimal (e.g. 0.05 = 5%) */
  maxDailyDrawdown?: number;
  /** Total/overall drawdown limit as a decimal (e.g. 0.10 = 10%) */
  maxTotalDrawdown?: number;
  /** Profit target as a decimal (e.g. 0.10 = 10%) */
  profitTarget?: number;
  /** Equity at start of today (for daily loss tracking) */
  todayStartEquity?: number;
  /** Status: 'active' | 'passed' | 'failed' */
  status?: 'active' | 'passed' | 'failed';
}

export default function ChallengeGauge({
  equity,
  startBalance,
  maxDailyDrawdown = 0.05,
  maxTotalDrawdown = 0.10,
  profitTarget = 0.10,
  todayStartEquity,
  status = 'active',
}: ChallengeGaugeProps) {
  const [flash, setFlash] = useState(false);

  const todayStart = todayStartEquity ?? startBalance;

  // Daily loss: how much has equity dropped from today's start
  const dailyLossPct = Math.max(0, (todayStart - equity) / startBalance);
  const dailyLossUsed = Math.min(1, dailyLossPct / maxDailyDrawdown);
  const dailyLossDanger = dailyLossUsed > 0.7;

  // Total drawdown: how much has equity dropped from starting balance
  const totalDrawdownPct = Math.max(0, (startBalance - equity) / startBalance);
  const totalDrawdownUsed = Math.min(1, totalDrawdownPct / maxTotalDrawdown);

  // Profit: how much has equity grown from starting balance
  const profitPct = Math.max(0, (equity - startBalance) / startBalance);
  const profitUsed = Math.min(1, profitPct / profitTarget);

  // Flash borders when daily loss > 70% of limit
  useEffect(() => {
    if (dailyLossDanger && status === 'active') {
      const interval = setInterval(() => setFlash((f) => !f), 700);
      return () => clearInterval(interval);
    }
    setFlash(false);
  }, [dailyLossDanger, status]);

  if (status === 'passed') {
    return (
      <div className="challenge-gauge passed">
        <div className="badge">🏆</div>
        <div className="status-text">Challenge Passed!</div>
        <p className="sub">Your certificate is ready to download.</p>
        <style jsx>{`
          .challenge-gauge { padding: 20px; text-align: center; }
          .badge { font-size: 48px; margin-bottom: 8px; }
          .status-text { font-size: 18px; font-weight: 700; color: #10b981; margin-bottom: 4px; }
          .sub { font-size: 13px; color: #64748b; }
        `}</style>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="challenge-gauge failed">
        <div className="badge">❌</div>
        <div className="status-text">Challenge Failed</div>
        <p className="sub">A rule was broken. Start a new challenge to try again.</p>
        <style jsx>{`
          .challenge-gauge { padding: 20px; text-align: center; }
          .badge { font-size: 48px; margin-bottom: 8px; }
          .status-text { font-size: 18px; font-weight: 700; color: #ef4444; margin-bottom: 4px; }
          .sub { font-size: 13px; color: #64748b; }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`challenge-gauge${flash ? ' flash' : ''}`}>
      <div className="gauge-header">
        <span className="gauge-title">⚡ Challenge Status</span>
        <span className="gauge-badge active">ACTIVE</span>
      </div>

      {/* Profit Target */}
      <div className="gauge-section">
        <div className="gauge-row">
          <span className="gauge-label">Profit Target</span>
          <span className="gauge-value profit">
            +{(profitPct * 100).toFixed(2)}% / {(profitTarget * 100).toFixed(0)}%
          </span>
        </div>
        <div className="bar-track">
          <div
            className="bar-fill profit"
            style={{ width: `${profitUsed * 100}%` }}
          />
        </div>
      </div>

      {/* Daily Loss Limit */}
      <div className="gauge-section">
        <div className="gauge-row">
          <span className="gauge-label">Daily Loss Limit</span>
          <span className={`gauge-value${dailyLossDanger ? ' danger' : ''}`}>
            {(dailyLossPct * 100).toFixed(2)}% / {(maxDailyDrawdown * 100).toFixed(0)}%
          </span>
        </div>
        <div className="bar-track">
          <div
            className={`bar-fill loss${dailyLossDanger ? ' danger' : ''}`}
            style={{ width: `${dailyLossUsed * 100}%` }}
          />
        </div>
        {dailyLossDanger && (
          <p className="warn-text">⚠️ Approaching daily loss limit!</p>
        )}
      </div>

      {/* Total Drawdown */}
      <div className="gauge-section">
        <div className="gauge-row">
          <span className="gauge-label">Max Drawdown</span>
          <span className={`gauge-value${totalDrawdownUsed > 0.7 ? ' danger' : ''}`}>
            {(totalDrawdownPct * 100).toFixed(2)}% / {(maxTotalDrawdown * 100).toFixed(0)}%
          </span>
        </div>
        <div className="bar-track">
          <div
            className={`bar-fill loss${totalDrawdownUsed > 0.7 ? ' danger' : ''}`}
            style={{ width: `${totalDrawdownUsed * 100}%` }}
          />
        </div>
      </div>

      {/* Equity */}
      <div className="equity-row">
        <span className="eq-label">Current Equity</span>
        <span className={`eq-value${equity >= startBalance ? ' profit' : ' danger'}`}>
          ${equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      <style jsx>{`
        .challenge-gauge {
          padding: 18px;
          background: var(--depth, #111827);
          border: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
          border-radius: 14px;
          transition: border-color 0.3s;
        }
        .challenge-gauge.flash {
          border-color: rgba(239, 68, 68, 0.5);
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .gauge-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }
        .gauge-title { font-size: 14px; font-weight: 700; color: var(--text-primary, #f8fafc); }
        .gauge-badge.active {
          font-size: 10px; font-weight: 700; padding: 3px 8px;
          border-radius: 20px; background: rgba(16,185,129,0.15);
          color: #10b981; letter-spacing: 0.5px;
        }

        .gauge-section { margin-bottom: 16px; }

        .gauge-row {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 6px;
        }
        .gauge-label { font-size: 12px; color: var(--text-muted, #94a3b8); }
        .gauge-value { font-size: 12px; font-weight: 600; font-family: monospace; color: var(--text-primary, #f8fafc); }
        .gauge-value.profit { color: #10b981; }
        .gauge-value.danger { color: #ef4444; }

        .bar-track {
          height: 6px; background: rgba(255,255,255,0.06);
          border-radius: 3px; overflow: hidden;
        }
        .bar-fill {
          height: 100%; border-radius: 3px;
          transition: width 0.5s ease;
        }
        .bar-fill.profit { background: linear-gradient(90deg, #10b981, #34d399); }
        .bar-fill.loss { background: linear-gradient(90deg, #f59e0b, #ef4444); }
        .bar-fill.loss.danger { background: #ef4444; }

        .warn-text {
          font-size: 11px; color: #ef4444; font-weight: 600;
          margin: 6px 0 0; text-align: right;
        }

        .equity-row {
          display: flex; justify-content: space-between; align-items: center;
          padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.05);
          margin-top: 4px;
        }
        .eq-label { font-size: 12px; color: var(--text-muted, #94a3b8); }
        .eq-value { font-size: 16px; font-weight: 700; font-family: monospace; }
        .eq-value.profit { color: #10b981; }
        .eq-value.danger { color: #ef4444; }
      `}</style>
    </div>
  );
}
