"use client";

import Navbar from "@/components/layout/Navbar";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Trade {
  id: string;
  symbol: string;
  date: string;
  time: string;
  side: "LONG" | "SHORT";
  pnl: number;
  tags: string[];
  emotion?: string;
  thesis?: string;
}

interface DayData {
  date: string;
  trades: Trade[];
  totalPnl: number;
}

export default function JournalPage() {
  const router = useRouter();
  const { checkAuth } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const run = async () => {
      const ok = await checkAuth();
      if (!ok) {
        router.replace("/landing?auth=login");
      }
    };
    run();
  }, [checkAuth, router]);

  // Mock trade data
  const mockTrades: Trade[] = [
    { id: "1", symbol: "TSLA", date: "2023-10-05", time: "10:30 AM", side: "LONG", pnl: 1650, tags: ["Breakout", "Gap Fill"], emotion: "confident" },
    { id: "2", symbol: "BTC/USD", date: "2023-10-05", time: "14:15 PM", side: "SHORT", pnl: -320, tags: ["Reversal"], emotion: "fear" },
    { id: "3", symbol: "ETH/USDT", date: "2023-10-04", time: "09:45 AM", side: "LONG", pnl: 850, tags: ["Trend Follow"], emotion: "confident" },
    { id: "4", symbol: "SOL/USDT", date: "2023-10-03", time: "11:00 AM", side: "LONG", pnl: -150, tags: ["Scalp"], emotion: "revenge" },
    { id: "5", symbol: "AAPL", date: "2023-10-02", time: "15:30 PM", side: "SHORT", pnl: 420, tags: ["Breakout"], emotion: "confident" },
  ];

  // Generate calendar data
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (DayData | null)[] = [];

    // Add empty slots for days before the first
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayTrades = mockTrades.filter((t) => t.date === dateStr);
      const totalPnl = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
      
      days.push({
        date: dateStr,
        trades: dayTrades,
        totalPnl,
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const selectedDayTrades = selectedDate
    ? mockTrades.filter((t) => t.date === selectedDate)
    : [];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const openJournalModal = (trade: Trade) => {
    setSelectedTrade(trade);
    setJournalModalOpen(true);
  };

  return (
    <div className="journal-page">
      <Navbar />

      <main className="journal-content">
        <div className="page-header">
          <h1>Trading Journal</h1>
          <p className="subtitle">Review and reflect on your trades</p>
        </div>

        <div className="journal-layout">
          {/* Left Panel - Calendar */}
          <div className="calendar-panel">
            <div className="calendar-header">
              <button className="nav-btn" onClick={handlePrevMonth}>←</button>
              <span className="month-year">
                {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <button className="nav-btn" onClick={handleNextMonth}>→</button>
            </div>

            <div className="calendar-grid">
              {/* Week day headers */}
              {weekDays.map((day) => (
                <div key={day} className="weekday-header">{day}</div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((dayData, index) => (
                <div
                  key={index}
                  className={`calendar-day ${!dayData ? "empty" : ""} ${
                    dayData?.trades.length ? (dayData.totalPnl >= 0 ? "profitable" : "loss") : ""
                  } ${selectedDate === dayData?.date ? "selected" : ""}`}
                  onClick={() => dayData && setSelectedDate(dayData.date)}
                >
                  {dayData && (
                    <>
                      <span className="day-number">
                        {new Date(dayData.date).getDate()}
                      </span>
                      {dayData.trades.length > 0 && (
                        <span className="trade-indicator">
                          {dayData.trades.length}
                        </span>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="calendar-legend">
              <div className="legend-item">
                <span className="legend-dot profitable"></span>
                <span>Profitable</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot loss"></span>
                <span>Loss</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot neutral"></span>
                <span>No Trade</span>
              </div>
            </div>
          </div>

          {/* Right Panel - Trade Details */}
          <div className="details-panel">
            {selectedDate ? (
              <>
                <div className="details-header">
                  <h2>
                    {new Date(selectedDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </h2>
                  <span className="trade-count">
                    {selectedDayTrades.length} trade{selectedDayTrades.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="trades-list">
                  {selectedDayTrades.length > 0 ? (
                    selectedDayTrades.map((trade) => (
                      <div
                        key={trade.id}
                        className="trade-card"
                        onClick={() => openJournalModal(trade)}
                      >
                        <div className="trade-main">
                          <div className="trade-symbol">
                            <span className="symbol">{trade.symbol}</span>
                            <span className={`side ${trade.side.toLowerCase()}`}>
                              {trade.side}
                            </span>
                          </div>
                          <div className={`trade-pnl ${trade.pnl >= 0 ? "profit" : "loss"}`}>
                            {trade.pnl >= 0 ? "+" : ""}${Math.abs(trade.pnl).toLocaleString()}
                          </div>
                        </div>
                        <div className="trade-meta">
                          <span className="trade-time">{trade.time}</span>
                          <div className="trade-tags">
                            {trade.tags.map((tag) => (
                              <span key={tag} className="tag">{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-trades">
                      <span className="no-trades-icon">📊</span>
                      <p>No trades on this day</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="select-prompt">
                <span className="prompt-icon">📅</span>
                <p>Select a day to view trades</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Journal Modal */}
      {journalModalOpen && selectedTrade && (
        <JournalModal
          trade={selectedTrade}
          onClose={() => {
            setJournalModalOpen(false);
            setSelectedTrade(null);
          }}
        />
      )}

      <style jsx>{`
        .journal-page {
          min-height: 100vh;
          background: #0F172A;
        }

        .journal-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
        }

        .page-header {
          margin-bottom: 32px;
        }

        .page-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #F1F5F9;
          margin: 0 0 4px 0;
        }

        .subtitle {
          color: #64748B;
          font-size: 14px;
          margin: 0;
        }

        .journal-layout {
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: 24px;
        }

        /* Calendar Panel */
        .calendar-panel {
          background: #1E293B;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #334155;
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .nav-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #334155;
          border: none;
          color: #94A3B8;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nav-btn:hover {
          background: #475569;
          color: #F1F5F9;
        }

        .month-year {
          font-size: 16px;
          font-weight: 600;
          color: #F1F5F9;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }

        .weekday-header {
          padding: 8px;
          text-align: center;
          font-size: 11px;
          font-weight: 600;
          color: #64748B;
          text-transform: uppercase;
        }

        .calendar-day {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
          background: rgba(0, 0, 0, 0.2);
        }

        .calendar-day.empty {
          background: transparent;
          cursor: default;
        }

        .calendar-day:not(.empty):hover {
          background: #334155;
        }

        .calendar-day.profitable {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .calendar-day.loss {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .calendar-day.selected {
          ring: 2px solid #3B82F6;
          box-shadow: 0 0 0 2px #3B82F6;
        }

        .day-number {
          font-size: 14px;
          font-weight: 500;
          color: #F1F5F9;
        }

        .trade-indicator {
          position: absolute;
          bottom: 4px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #3B82F6;
        }

        .calendar-legend {
          display: flex;
          gap: 16px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #334155;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #94A3B8;
        }

        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 4px;
        }

        .legend-dot.profitable {
          background: rgba(16, 185, 129, 0.5);
        }

        .legend-dot.loss {
          background: rgba(239, 68, 68, 0.5);
        }

        .legend-dot.neutral {
          background: rgba(100, 116, 139, 0.3);
        }

        /* Details Panel */
        .details-panel {
          background: #1E293B;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #334155;
        }

        .details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #334155;
        }

        .details-header h2 {
          font-size: 18px;
          font-weight: 600;
          color: #F1F5F9;
          margin: 0;
        }

        .trade-count {
          font-size: 13px;
          color: #64748B;
        }

        .trades-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .trade-card {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }

        .trade-card:hover {
          background: rgba(0, 0, 0, 0.3);
          border-color: #334155;
        }

        .trade-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .trade-symbol {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .symbol {
          font-size: 16px;
          font-weight: 600;
          color: #F1F5F9;
        }

        .side {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .side.long {
          background: rgba(16, 185, 129, 0.15);
          color: #10B981;
        }

        .side.short {
          background: rgba(239, 68, 68, 0.15);
          color: #EF4444;
        }

        .trade-pnl {
          font-size: 18px;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
        }

        .trade-pnl.profit {
          color: #10B981;
        }

        .trade-pnl.loss {
          color: #EF4444;
        }

        .trade-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .trade-time {
          font-size: 12px;
          color: #64748B;
        }

        .trade-tags {
          display: flex;
          gap: 6px;
        }

        .tag {
          font-size: 11px;
          padding: 3px 8px;
          background: #334155;
          color: #94A3B8;
          border-radius: 4px;
        }

        .no-trades,
        .select-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: #64748B;
        }

        .no-trades-icon,
        .prompt-icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.5;
        }

        @media (max-width: 900px) {
          .journal-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

// Journal Modal Component
function JournalModal({ trade, onClose }: { trade: Trade; onClose: () => void }) {
  const [emotion, setEmotion] = useState(trade.emotion || "");
  const [thesis, setThesis] = useState(trade.thesis || "");
  const [tags, setTags] = useState(trade.tags);
  const [newTag, setNewTag] = useState("");
  const [isMistake, setIsMistake] = useState(false);

  const emotions = [
    { value: "fear", icon: "😱", label: "Fear" },
    { value: "confident", icon: "😎", label: "Confident" },
    { value: "revenge", icon: "😡", label: "Revenge" },
  ];

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Left - Chart Snapshot */}
        <div className="modal-chart">
          <div className="chart-tabs">
            <button className="chart-tab active">5min Chart</button>
            <button className="chart-tab">VWAP</button>
          </div>
          <div className="chart-placeholder">
            <div className="mock-chart">
              {/* Simplified mock chart visualization */}
              <svg viewBox="0 0 400 200" className="chart-svg">
                <defs>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(16, 185, 129, 0.3)" />
                    <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,150 L50,140 L100,120 L150,130 L200,80 L250,90 L300,60 L350,70 L400,50"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2"
                />
                <path
                  d="M0,150 L50,140 L100,120 L150,130 L200,80 L250,90 L300,60 L350,70 L400,50 L400,200 L0,200 Z"
                  fill="url(#chartGradient)"
                />
                {/* Entry marker */}
                <circle cx="200" cy="80" r="6" fill="#3B82F6" />
                <text x="200" y="70" fill="#3B82F6" fontSize="10" textAnchor="middle">Entry</text>
              </svg>
            </div>
          </div>
          <div className="chart-actions">
            <button className="chart-action">📸 Add Snapshot</button>
            <button className="chart-action">📊 Open in TradingView</button>
          </div>
        </div>

        {/* Right - Journal Entry */}
        <div className="modal-form">
          <div className="modal-header">
            <div className="trade-info">
              <span className="trade-symbol">{trade.symbol}</span>
              <span className={`trade-pnl ${trade.pnl >= 0 ? "profit" : "loss"}`}>
                {trade.pnl >= 0 ? "+" : ""}${Math.abs(trade.pnl).toLocaleString()}
              </span>
            </div>
            <span className="trade-date">{trade.date} • {trade.time}</span>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>

          <div className="form-section">
            <label>HOW DID YOU FEEL?</label>
            <div className="emotion-selector">
              {emotions.map((em) => (
                <button
                  key={em.value}
                  className={`emotion-btn ${emotion === em.value ? "active" : ""}`}
                  onClick={() => setEmotion(em.value)}
                >
                  <span className="emotion-icon">{em.icon}</span>
                  <span className="emotion-label">{em.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label>WHAT WAS YOUR THESIS?</label>
            <textarea
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              placeholder="Market was trending up. VWAP hold..."
              rows={4}
            />
          </div>

          <div className="form-section">
            <label>STRATEGY TAGS</label>
            <div className="tags-container">
              {tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                  <button className="tag-remove" onClick={() => removeTag(tag)}>×</button>
                </span>
              ))}
            </div>
            <div className="add-tag">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag..."
                onKeyPress={(e) => e.key === "Enter" && addTag()}
              />
              <button onClick={addTag}>+</button>
            </div>
          </div>

          <div className="form-section">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isMistake}
                onChange={(e) => setIsMistake(e.target.checked)}
              />
              <span className="checkmark"></span>
              Mark as Mistake / Fumbled
            </label>
          </div>

          <div className="modal-actions">
            <button className="cancel-btn" onClick={onClose}>Cancel</button>
            <button className="save-btn">Save Journal</button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: #1E293B;
          border-radius: 20px;
          border: 1px solid #334155;
          display: grid;
          grid-template-columns: 1fr 1fr;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
        }

        .modal-chart {
          background: #0F172A;
          padding: 20px;
          display: flex;
          flex-direction: column;
        }

        .chart-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .chart-tab {
          padding: 8px 16px;
          background: #1E293B;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #94A3B8;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .chart-tab.active {
          background: #334155;
          color: #F1F5F9;
        }

        .chart-placeholder {
          flex: 1;
          background: #1E293B;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 300px;
        }

        .mock-chart {
          width: 100%;
          height: 100%;
          padding: 20px;
        }

        .chart-svg {
          width: 100%;
          height: 100%;
        }

        .chart-actions {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }

        .chart-action {
          flex: 1;
          padding: 10px;
          background: transparent;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #94A3B8;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .chart-action:hover {
          background: #334155;
          color: #F1F5F9;
        }

        .modal-form {
          padding: 24px;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          flex-direction: column;
          margin-bottom: 24px;
          position: relative;
        }

        .trade-info {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }

        .trade-symbol {
          font-size: 24px;
          font-weight: 700;
          color: #F1F5F9;
        }

        .trade-pnl {
          font-size: 18px;
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
        }

        .trade-pnl.profit {
          color: #10B981;
        }

        .trade-pnl.loss {
          color: #EF4444;
        }

        .trade-date {
          font-size: 13px;
          color: #64748B;
          margin-top: 4px;
        }

        .close-btn {
          position: absolute;
          top: 0;
          right: 0;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: #64748B;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #334155;
          color: #F1F5F9;
        }

        .form-section {
          margin-bottom: 20px;
        }

        .form-section label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #64748B;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
        }

        .emotion-selector {
          display: flex;
          gap: 12px;
        }

        .emotion-btn {
          flex: 1;
          padding: 16px;
          background: #0F172A;
          border: 2px solid #334155;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .emotion-btn:hover {
          border-color: #475569;
        }

        .emotion-btn.active {
          border-color: #10B981;
          background: rgba(16, 185, 129, 0.1);
        }

        .emotion-icon {
          font-size: 28px;
        }

        .emotion-label {
          font-size: 12px;
          color: #94A3B8;
        }

        .emotion-btn.active .emotion-label {
          color: #10B981;
        }

        textarea {
          width: 100%;
          padding: 12px;
          background: #0F172A;
          border: 1px solid #334155;
          border-radius: 10px;
          color: #F1F5F9;
          font-size: 14px;
          resize: none;
          font-family: inherit;
        }

        textarea::placeholder {
          color: #64748B;
        }

        textarea:focus {
          outline: none;
          border-color: #3B82F6;
        }

        .tags-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .tag {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #10B981;
          color: white;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .tag-remove {
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 14px;
          opacity: 0.7;
        }

        .tag-remove:hover {
          opacity: 1;
        }

        .add-tag {
          display: flex;
          gap: 8px;
        }

        .add-tag input {
          flex: 1;
          padding: 10px 14px;
          background: #0F172A;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #F1F5F9;
          font-size: 13px;
        }

        .add-tag input:focus {
          outline: none;
          border-color: #3B82F6;
        }

        .add-tag button {
          width: 40px;
          background: #334155;
          border: 1px solid #475569;
          border-radius: 8px;
          color: #94A3B8;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-tag button:hover {
          background: #475569;
          color: #F1F5F9;
        }

        .checkbox-label {
          display: flex !important;
          align-items: center;
          gap: 10px;
          font-size: 13px !important;
          color: #94A3B8 !important;
          cursor: pointer;
        }

        .checkbox-label input {
          width: 18px;
          height: 18px;
          accent-color: #3B82F6;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: auto;
          padding-top: 20px;
          border-top: 1px solid #334155;
        }

        .cancel-btn {
          flex: 1;
          padding: 12px;
          background: transparent;
          border: 1px solid #334155;
          border-radius: 10px;
          color: #94A3B8;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-btn:hover {
          background: #334155;
          color: #F1F5F9;
        }

        .save-btn {
          flex: 1;
          padding: 12px;
          background: #10B981;
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .save-btn:hover {
          background: #059669;
        }

        @media (max-width: 768px) {
          .modal-content {
            grid-template-columns: 1fr;
            max-height: 95vh;
          }

          .modal-chart {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
