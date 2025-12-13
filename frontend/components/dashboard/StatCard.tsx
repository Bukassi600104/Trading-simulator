"use client";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon?: string;
  trend?: "up" | "down" | "neutral";
}

export default function StatCard({
  label,
  value,
  change,
  icon,
  trend = "neutral",
}: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-header">
        <span className="stat-label">{label}</span>
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      
      <div className="stat-value">{value}</div>
      
      {change && (
        <div className={`stat-change ${trend}`}>
          {trend === "up" && "↑ "}
          {trend === "down" && "↓ "}
          {change}
        </div>
      )}

      <style jsx>{`
        .stat-card {
          background: var(--surface);
          border-radius: 16px;
          padding: 20px;
          border: 1px solid var(--border-default);
        }

        .stat-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .stat-icon {
          width: 32px;
          height: 32px;
          background: var(--elevated);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
          font-family: var(--font-mono);
          margin-bottom: 4px;
        }

        .stat-change {
          font-size: 13px;
          font-weight: 600;
        }

        .stat-change.up {
          color: var(--profit-500);
        }

        .stat-change.down {
          color: var(--loss-500);
        }

        .stat-change.neutral {
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
