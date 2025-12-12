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
          background: #1E293B;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #334155;
        }

        .stat-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 12px;
          color: #64748B;
          font-weight: 500;
        }

        .stat-icon {
          width: 32px;
          height: 32px;
          background: #334155;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #F1F5F9;
          font-family: 'JetBrains Mono', monospace;
          margin-bottom: 4px;
        }

        .stat-change {
          font-size: 13px;
          font-weight: 600;
        }

        .stat-change.up {
          color: #10B981;
        }

        .stat-change.down {
          color: #EF4444;
        }

        .stat-change.neutral {
          color: #64748B;
        }
      `}</style>
    </div>
  );
}
