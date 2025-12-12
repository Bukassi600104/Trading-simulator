"use client";

interface PropChallengeWidgetProps {
  targetAmount?: number;
  currentAmount?: number;
  maxDailyDrawdown?: number;
  currentDailyDrawdown?: number;
  phase?: string;
  isActive?: boolean;
}

export default function PropChallengeWidget({
  targetAmount = 110000,
  currentAmount = 104230,
  maxDailyDrawdown = 5,
  currentDailyDrawdown = 2.1,
  phase = "Phase 1 Evaluation",
  isActive = true,
}: PropChallengeWidgetProps) {
  const progress = (currentAmount / targetAmount) * 100;
  const drawdownPercent = (currentDailyDrawdown / maxDailyDrawdown) * 100;
  const hardBreachLevel = 100000; // Example hard breach level

  return (
    <div className="prop-challenge-widget">
      <div className="widget-header">
        <div className="header-left">
          <span className="trophy-icon">🏆</span>
          <span className="challenge-title">Prop Challenge</span>
          <span className="phase-label">• {phase}</span>
        </div>
        <span className={`status-badge ${isActive ? "active" : "inactive"}`}>
          {isActive ? "ACTIVE" : "INACTIVE"}
        </span>
      </div>

      <div className="widget-content">
        {/* Circular Progress */}
        <div className="progress-section">
          <div className="circular-progress">
            <svg viewBox="0 0 100 100" className="progress-ring">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#334155"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${progress * 2.64} 264`}
                transform="rotate(-90 50 50)"
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#34D399" />
                </linearGradient>
              </defs>
            </svg>
            <div className="progress-inner">
              <span className="target-label">TARGET</span>
              <span className="target-value">${(targetAmount / 1000).toFixed(0)}k</span>
              <span className="progress-percent">{progress.toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-section">
          <div className="stat-row">
            <span className="stat-label">Profit Target Progress</span>
            <span className="stat-value">
              ${currentAmount.toLocaleString()} / ${targetAmount.toLocaleString()}
            </span>
          </div>

          <div className="drawdown-section">
            <div className="drawdown-header">
              <span className="drawdown-label">Max Daily Drawdown ⓘ</span>
              <span className="drawdown-value">{currentDailyDrawdown}% Remaining</span>
            </div>
            <div className="drawdown-bar">
              <div
                className="drawdown-fill"
                style={{ width: `${100 - drawdownPercent}%` }}
              />
              <div
                className="drawdown-used"
                style={{ width: `${drawdownPercent}%` }}
              />
            </div>
            <div className="breach-level">
              Hard Breach Level: ${hardBreachLevel.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .prop-challenge-widget {
          background: #1E293B;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #334155;
        }

        .widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .trophy-icon {
          font-size: 18px;
        }

        .challenge-title {
          font-size: 16px;
          font-weight: 600;
          color: #F1F5F9;
        }

        .phase-label {
          font-size: 14px;
          color: #64748B;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .status-badge.active {
          background: rgba(16, 185, 129, 0.15);
          color: #10B981;
        }

        .status-badge.inactive {
          background: rgba(100, 116, 139, 0.15);
          color: #64748B;
        }

        .widget-content {
          display: flex;
          gap: 24px;
          align-items: center;
        }

        .progress-section {
          flex-shrink: 0;
        }

        .circular-progress {
          position: relative;
          width: 140px;
          height: 140px;
        }

        .progress-ring {
          width: 100%;
          height: 100%;
        }

        .progress-inner {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .target-label {
          display: block;
          font-size: 10px;
          color: #64748B;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }

        .target-value {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: #F1F5F9;
          font-family: 'JetBrains Mono', monospace;
        }

        .progress-percent {
          display: block;
          font-size: 12px;
          color: #10B981;
          font-weight: 600;
        }

        .stats-section {
          flex: 1;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .stat-label {
          font-size: 13px;
          color: #94A3B8;
        }

        .stat-value {
          font-size: 13px;
          color: #F1F5F9;
          font-family: 'JetBrains Mono', monospace;
        }

        .drawdown-section {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          padding: 12px;
        }

        .drawdown-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .drawdown-label {
          font-size: 12px;
          color: #94A3B8;
        }

        .drawdown-value {
          font-size: 12px;
          color: #10B981;
          font-weight: 600;
        }

        .drawdown-bar {
          height: 8px;
          background: #334155;
          border-radius: 4px;
          overflow: hidden;
          display: flex;
        }

        .drawdown-fill {
          height: 100%;
          background: linear-gradient(90deg, #10B981, #34D399);
          transition: width 0.5s ease;
        }

        .drawdown-used {
          height: 100%;
          background: linear-gradient(90deg, #EF4444, #F87171);
          transition: width 0.5s ease;
        }

        .breach-level {
          margin-top: 8px;
          font-size: 11px;
          color: #64748B;
        }
      `}</style>
    </div>
  );
}
