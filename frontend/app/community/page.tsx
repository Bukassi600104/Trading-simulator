"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import AuthModal from "@/components/AuthModal";

interface ClanMember {
  id: string;
  name: string;
  avatar: string;
  pnl: number;
  trades: number;
  winRate: number;
  isOnline: boolean;
}

interface Clan {
  id: string;
  name: string;
  avatar: string;
  level: number;
  score: number;
  members: ClanMember[];
  rank: number;
  aum: number;
}

interface Message {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
}

export default function CommunityPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"my-clan" | "leaderboard" | "battles">("my-clan");
  const [chatMessage, setChatMessage] = useState("");

  // Mock clan data
  const myClan: Clan = {
    id: "1",
    name: "Wolfpack Alpha",
    avatar: "🐺",
    level: 42,
    score: 15420,
    rank: 4,
    aum: 2540000,
    members: [
      { id: "1", name: "SarahTrades", avatar: "👩", pnl: 12500, trades: 156, winRate: 72, isOnline: true },
      { id: "2", name: "CryptoKing", avatar: "👑", pnl: 9800, trades: 98, winRate: 68, isOnline: true },
      { id: "3", name: "NightOwl", avatar: "🦉", pnl: 7200, trades: 201, winRate: 65, isOnline: false },
      { id: "4", name: "You", avatar: "😎", pnl: 5600, trades: 87, winRate: 61, isOnline: true },
      { id: "5", name: "BullRunner", avatar: "🐂", pnl: 4100, trades: 134, winRate: 58, isOnline: false },
    ],
  };

  const topClans: Clan[] = [
    { id: "1", name: "Diamond Hands", avatar: "💎", level: 58, score: 24500, rank: 1, aum: 5200000, members: [] },
    { id: "2", name: "Moon Squad", avatar: "🌙", level: 52, score: 21200, rank: 2, aum: 4100000, members: [] },
    { id: "3", name: "Bull Market", avatar: "🐂", level: 48, score: 18900, rank: 3, aum: 3800000, members: [] },
    { id: "4", name: "Wolfpack Alpha", avatar: "🐺", level: 42, score: 15420, rank: 4, aum: 2540000, members: [] },
    { id: "5", name: "Bear Hunters", avatar: "🎯", level: 39, score: 14200, rank: 5, aum: 2100000, members: [] },
  ];

  const chatMessages: Message[] = [
    { id: "1", author: "SarahTrades", avatar: "👩", content: "BTC looking bullish on the 4H chart", timestamp: "10:32 AM" },
    { id: "2", author: "CryptoKing", avatar: "👑", content: "Agreed, I'm seeing a potential breakout above 94k", timestamp: "10:35 AM" },
    { id: "3", author: "NightOwl", avatar: "🦉", content: "Watch out for the resistance at 95.5k though", timestamp: "10:38 AM" },
    { id: "4", author: "You", avatar: "😎", content: "Just entered a long position with 10x leverage", timestamp: "10:42 AM" },
  ];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    // Would send to backend in real implementation
    setChatMessage("");
  };

  return (
    <div className="community-page">
      <Navbar onOpenAuth={() => setAuthModalOpen(true)} />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <main className="community-content">
        <div className="page-header">
          <h1>Community</h1>
          <p className="subtitle">Trade together, win together</p>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === "my-clan" ? "active" : ""}`}
            onClick={() => setActiveTab("my-clan")}
          >
            My Clan
          </button>
          <button
            className={`tab ${activeTab === "leaderboard" ? "active" : ""}`}
            onClick={() => setActiveTab("leaderboard")}
          >
            Leaderboard
          </button>
          <button
            className={`tab ${activeTab === "battles" ? "active" : ""}`}
            onClick={() => setActiveTab("battles")}
          >
            Clan Battles
          </button>
        </div>

        {activeTab === "my-clan" && (
          <div className="clan-layout">
            {/* Clan Info */}
            <div className="clan-info-panel">
              <div className="clan-header">
                <div className="clan-avatar">{myClan.avatar}</div>
                <div className="clan-details">
                  <h2>{myClan.name}</h2>
                  <div className="clan-badges">
                    <span className="level-badge">LEVEL {myClan.level}</span>
                    <span className="rank-badge">RANK #{myClan.rank}</span>
                  </div>
                </div>
              </div>

              <div className="clan-stats">
                <div className="stat">
                  <span className="stat-label">Clan Score</span>
                  <span className="stat-value">{myClan.score.toLocaleString()}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Total AUM</span>
                  <span className="stat-value">${(myClan.aum / 1000000).toFixed(2)}M</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Members</span>
                  <span className="stat-value">{myClan.members.length}/10</span>
                </div>
              </div>

              {/* Member Roster */}
              <div className="members-section">
                <h3>Member Roster</h3>
                <div className="members-list">
                  {myClan.members.map((member, index) => (
                    <div key={member.id} className="member-row">
                      <div className="member-rank">#{index + 1}</div>
                      <div className="member-avatar">
                        {member.avatar}
                        <span className={`online-indicator ${member.isOnline ? "online" : ""}`} />
                      </div>
                      <div className="member-info">
                        <span className="member-name">{member.name}</span>
                        <span className="member-stats">{member.trades} trades • {member.winRate}% win</span>
                      </div>
                      <div className={`member-pnl ${member.pnl >= 0 ? "positive" : "negative"}`}>
                        {member.pnl >= 0 ? "+" : ""}${member.pnl.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Clan Chat */}
            <div className="clan-chat-panel">
              <div className="chat-header">
                <h3>Clan Chat</h3>
                <span className="online-count">5 online</span>
              </div>

              <div className="chat-messages">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="message">
                    <div className="message-avatar">{msg.avatar}</div>
                    <div className="message-content">
                      <div className="message-header">
                        <span className="message-author">{msg.author}</span>
                        <span className="message-time">{msg.timestamp}</span>
                      </div>
                      <p className="message-text">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              <form className="chat-input" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                />
                <button type="submit">Send</button>
              </form>
            </div>
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div className="leaderboard-panel">
            <div className="leaderboard-header">
              <h2>Top Clans</h2>
              <span className="season-badge">Season 4</span>
            </div>

            <div className="leaderboard-list">
              {topClans.map((clan) => (
                <div key={clan.id} className={`leaderboard-row ${clan.name === myClan.name ? "highlight" : ""}`}>
                  <div className="clan-rank">
                    {clan.rank <= 3 ? ["🥇", "🥈", "🥉"][clan.rank - 1] : `#${clan.rank}`}
                  </div>
                  <div className="clan-avatar">{clan.avatar}</div>
                  <div className="clan-info">
                    <span className="clan-name">{clan.name}</span>
                    <span className="clan-level">Level {clan.level}</span>
                  </div>
                  <div className="clan-score">
                    <span className="score-value">{clan.score.toLocaleString()}</span>
                    <span className="score-label">points</span>
                  </div>
                  <div className="clan-aum">
                    ${(clan.aum / 1000000).toFixed(1)}M
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "battles" && (
          <div className="battles-panel">
            <div className="battles-header">
              <h2>Clan Battles</h2>
              <button className="challenge-btn">⚔️ Challenge a Clan</button>
            </div>

            <div className="active-battle">
              <h3>Active Battle</h3>
              <div className="battle-card">
                <div className="battle-team">
                  <div className="team-avatar">🐺</div>
                  <span className="team-name">Wolfpack Alpha</span>
                  <span className="team-score">+$12,450</span>
                </div>
                <div className="battle-vs">VS</div>
                <div className="battle-team">
                  <div className="team-avatar">🎯</div>
                  <span className="team-name">Bear Hunters</span>
                  <span className="team-score">+$9,200</span>
                </div>
              </div>
              <div className="battle-timer">
                <span>Ends in:</span>
                <span className="time">23:45:12</span>
              </div>
            </div>

            <div className="battle-history">
              <h3>Recent Battles</h3>
              <div className="history-list">
                <div className="history-item win">
                  <span className="result">WIN</span>
                  <span className="opponent">vs Moon Squad</span>
                  <span className="prize">+500 pts</span>
                </div>
                <div className="history-item win">
                  <span className="result">WIN</span>
                  <span className="opponent">vs Crypto Legends</span>
                  <span className="prize">+500 pts</span>
                </div>
                <div className="history-item loss">
                  <span className="result">LOSS</span>
                  <span className="opponent">vs Diamond Hands</span>
                  <span className="prize">-200 pts</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .community-page {
          min-height: 100vh;
          background: #0F172A;
        }

        .community-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
        }

        .page-header {
          margin-bottom: 32px;
        }

        .page-header h1 {
          font-size: 32px;
          font-weight: 700;
          color: #F1F5F9;
          margin: 0 0 8px 0;
        }

        .subtitle {
          color: #64748B;
          margin: 0;
        }

        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid #334155;
          padding-bottom: 12px;
        }

        .tab {
          padding: 10px 20px;
          background: transparent;
          border: none;
          color: #64748B;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .tab:hover {
          color: #F1F5F9;
          background: #1E293B;
        }

        .tab.active {
          background: #3B82F6;
          color: white;
        }

        .clan-layout {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 24px;
        }

        .clan-info-panel,
        .clan-chat-panel {
          background: #1E293B;
          border-radius: 16px;
          border: 1px solid #334155;
          padding: 24px;
        }

        .clan-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .clan-avatar {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
        }

        .clan-details h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
          color: #F1F5F9;
        }

        .clan-badges {
          display: flex;
          gap: 8px;
        }

        .level-badge,
        .rank-badge {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .level-badge {
          background: rgba(59, 130, 246, 0.15);
          color: #3B82F6;
        }

        .rank-badge {
          background: rgba(16, 185, 129, 0.15);
          color: #10B981;
        }

        .clan-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          padding: 20px;
          background: #0F172A;
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .stat {
          text-align: center;
        }

        .stat-label {
          display: block;
          font-size: 12px;
          color: #64748B;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: #F1F5F9;
          font-family: 'JetBrains Mono', monospace;
        }

        .members-section h3 {
          font-size: 14px;
          color: #64748B;
          margin: 0 0 16px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .members-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .member-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #0F172A;
          border-radius: 10px;
        }

        .member-rank {
          width: 32px;
          font-size: 14px;
          font-weight: 600;
          color: #64748B;
        }

        .member-avatar {
          position: relative;
          font-size: 24px;
        }

        .online-indicator {
          position: absolute;
          bottom: 0;
          right: -2px;
          width: 10px;
          height: 10px;
          background: #64748B;
          border-radius: 50%;
          border: 2px solid #0F172A;
        }

        .online-indicator.online {
          background: #10B981;
        }

        .member-info {
          flex: 1;
        }

        .member-name {
          display: block;
          font-weight: 600;
          color: #F1F5F9;
        }

        .member-stats {
          font-size: 12px;
          color: #64748B;
        }

        .member-pnl {
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
        }

        .member-pnl.positive {
          color: #10B981;
        }

        .member-pnl.negative {
          color: #EF4444;
        }

        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .chat-header h3 {
          margin: 0;
          font-size: 16px;
          color: #F1F5F9;
        }

        .online-count {
          font-size: 12px;
          color: #10B981;
        }

        .chat-messages {
          height: 400px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 16px;
        }

        .message {
          display: flex;
          gap: 12px;
        }

        .message-avatar {
          font-size: 24px;
        }

        .message-content {
          flex: 1;
        }

        .message-header {
          display: flex;
          gap: 8px;
          align-items: baseline;
          margin-bottom: 4px;
        }

        .message-author {
          font-weight: 600;
          color: #F1F5F9;
        }

        .message-time {
          font-size: 11px;
          color: #64748B;
        }

        .message-text {
          margin: 0;
          color: #94A3B8;
          font-size: 14px;
        }

        .chat-input {
          display: flex;
          gap: 8px;
        }

        .chat-input input {
          flex: 1;
          padding: 12px 16px;
          background: #0F172A;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #F1F5F9;
          font-size: 14px;
        }

        .chat-input input:focus {
          outline: none;
          border-color: #3B82F6;
        }

        .chat-input button {
          padding: 12px 24px;
          background: #3B82F6;
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          cursor: pointer;
        }

        .chat-input button:hover {
          background: #2563EB;
        }

        /* Leaderboard styles */
        .leaderboard-panel {
          background: #1E293B;
          border-radius: 16px;
          border: 1px solid #334155;
          padding: 24px;
        }

        .leaderboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .leaderboard-header h2 {
          margin: 0;
          color: #F1F5F9;
        }

        .season-badge {
          padding: 6px 12px;
          background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%);
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          color: white;
        }

        .leaderboard-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .leaderboard-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: #0F172A;
          border-radius: 12px;
          border: 1px solid transparent;
        }

        .leaderboard-row.highlight {
          border-color: #3B82F6;
          background: rgba(59, 130, 246, 0.1);
        }

        .clan-rank {
          width: 48px;
          font-size: 20px;
          text-align: center;
        }

        .leaderboard-row .clan-avatar {
          width: 48px;
          height: 48px;
          font-size: 24px;
        }

        .leaderboard-row .clan-info {
          flex: 1;
        }

        .leaderboard-row .clan-name {
          display: block;
          font-weight: 600;
          color: #F1F5F9;
          font-size: 16px;
        }

        .leaderboard-row .clan-level {
          font-size: 12px;
          color: #64748B;
        }

        .clan-score {
          text-align: right;
        }

        .score-value {
          display: block;
          font-size: 18px;
          font-weight: 700;
          color: #F1F5F9;
          font-family: 'JetBrains Mono', monospace;
        }

        .score-label {
          font-size: 11px;
          color: #64748B;
        }

        .clan-aum {
          width: 80px;
          text-align: right;
          font-weight: 600;
          color: #10B981;
        }

        /* Battles styles */
        .battles-panel {
          background: #1E293B;
          border-radius: 16px;
          border: 1px solid #334155;
          padding: 24px;
        }

        .battles-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .battles-header h2 {
          margin: 0;
          color: #F1F5F9;
        }

        .challenge-btn {
          padding: 10px 20px;
          background: #EF4444;
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          cursor: pointer;
        }

        .active-battle {
          margin-bottom: 32px;
        }

        .active-battle h3,
        .battle-history h3 {
          font-size: 14px;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 16px 0;
        }

        .battle-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
          border-radius: 16px;
          border: 1px solid #334155;
          margin-bottom: 16px;
        }

        .battle-team {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .team-avatar {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
        }

        .team-name {
          font-weight: 600;
          color: #F1F5F9;
        }

        .team-score {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
          color: #10B981;
        }

        .battle-vs {
          font-size: 24px;
          font-weight: 700;
          color: #64748B;
        }

        .battle-timer {
          text-align: center;
          color: #64748B;
        }

        .battle-timer .time {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: #F59E0B;
          font-family: 'JetBrains Mono', monospace;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .history-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 16px;
          background: #0F172A;
          border-radius: 8px;
        }

        .history-item .result {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
        }

        .history-item.win .result {
          background: rgba(16, 185, 129, 0.15);
          color: #10B981;
        }

        .history-item.loss .result {
          background: rgba(239, 68, 68, 0.15);
          color: #EF4444;
        }

        .history-item .opponent {
          flex: 1;
          color: #94A3B8;
        }

        .history-item .prize {
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
        }

        .history-item.win .prize {
          color: #10B981;
        }

        .history-item.loss .prize {
          color: #EF4444;
        }

        @media (max-width: 1024px) {
          .clan-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
