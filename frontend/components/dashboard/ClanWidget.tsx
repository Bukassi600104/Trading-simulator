"use client";

interface ClanWidgetProps {
  clanName?: string;
  clanLevel?: number;
  rank?: number;
  members?: { name: string; change: string }[];
}

export default function ClanWidget({
  clanName = "Wolfpack Alpha",
  clanLevel = 42,
  rank = 4,
  members = [
    { name: "SarahTrades", change: "+12%" },
    { name: "CryptoKing", change: "+9.5%" },
  ],
}: ClanWidgetProps) {
  return (
    <div className="clan-widget">
      <div className="clan-header">
        <div className="clan-avatar">🐺</div>
        <div className="clan-info">
          <h3 className="clan-name">{clanName}</h3>
          <span className="clan-level">LEVEL {clanLevel} CLAN</span>
        </div>
      </div>

      <div className="rank-section">
        <span className="rank-label">Your Rank</span>
        <span className="rank-value">#{rank}</span>
      </div>

      <div className="leaderboard">
        {members.map((member, index) => (
          <div key={index} className="member-row">
            <div className="member-info">
              <span className="member-rank">{index + 1}</span>
              <span className="member-avatar">👤</span>
              <span className="member-name">{member.name}</span>
            </div>
            <span className={`member-change ${parseFloat(member.change) >= 0 ? "positive" : "negative"}`}>
              {member.change}
            </span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .clan-widget {
          background: #1E293B;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #334155;
        }

        .clan-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .clan-avatar {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .clan-info {
          display: flex;
          flex-direction: column;
        }

        .clan-name {
          font-size: 16px;
          font-weight: 600;
          color: #F1F5F9;
          margin: 0;
        }

        .clan-level {
          font-size: 11px;
          color: #3B82F6;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .rank-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #334155;
          margin-bottom: 16px;
        }

        .rank-label {
          font-size: 13px;
          color: #94A3B8;
        }

        .rank-value {
          font-size: 28px;
          font-weight: 700;
          color: #F1F5F9;
          font-family: 'JetBrains Mono', monospace;
        }

        .leaderboard {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .member-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }

        .member-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .member-rank {
          width: 20px;
          font-size: 12px;
          color: #64748B;
          font-weight: 600;
        }

        .member-avatar {
          font-size: 16px;
        }

        .member-name {
          font-size: 13px;
          color: #F1F5F9;
        }

        .member-change {
          font-size: 13px;
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
        }

        .member-change.positive {
          color: #10B981;
        }

        .member-change.negative {
          color: #EF4444;
        }
      `}</style>
    </div>
  );
}
