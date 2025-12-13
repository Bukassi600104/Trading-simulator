"use client";

import { API_BASE } from '@/lib/runtimeConfig';
import { eachDayOfInterval, format, subDays } from 'date-fns';
import { useEffect, useState, type CSSProperties } from 'react';

interface JournalEntry {
  id: string;
  pnl: number;
  exit_time: string;
}

export default function JournalHeatmap() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/journal/entries?limit=365`);
        if (res.ok) {
          const data = await res.json();
          setEntries(data);
        }
      } catch (error) {
        console.error("Failed to fetch journal entries", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntries();
  }, []);

  // Generate last 365 days
  const today = new Date();
  const startDate = subDays(today, 364); // 52 weeks * 7 = 364
  const days = eachDayOfInterval({ start: startDate, end: today });

  // Group PnL by day
  const pnlByDay = new Map<string, number>();
  entries.forEach(entry => {
    const dateStr = format(new Date(entry.exit_time), 'yyyy-MM-dd');
    const current = pnlByDay.get(dateStr) || 0;
    pnlByDay.set(dateStr, current + entry.pnl);
  });

  const getCellStyle = (pnl: number): CSSProperties => {
    // Use existing theme tokens (no new colors)
    if (pnl === 0) return { backgroundColor: 'var(--depth)' };
    if (pnl > 0) {
      if (pnl > 1000) return { backgroundColor: 'var(--profit-500)' };
      if (pnl > 500) return { backgroundColor: 'var(--profit-600)' };
      if (pnl > 100) return { backgroundColor: 'var(--profit-600)', opacity: 0.75 };
      return { backgroundColor: 'var(--profit-glow)' };
    }
    if (pnl < -1000) return { backgroundColor: 'var(--loss-500)' };
    if (pnl < -500) return { backgroundColor: 'var(--loss-600)' };
    if (pnl < -100) return { backgroundColor: 'var(--loss-600)', opacity: 0.75 };
    return { backgroundColor: 'var(--loss-glow)' };
  };

  if (isLoading) {
    return <div className="h-32 flex items-center justify-center text-gray-500">Loading heatmap...</div>;
  }

  return (
    <div className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
      <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>Trading Activity (Last Year)</h3>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {/* We can render weeks as columns */}
        {Array.from({ length: 53 }).map((_, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {Array.from({ length: 7 }).map((_, dayIndex) => {
              const day = days[weekIndex * 7 + dayIndex];
              if (!day || day > today) return null;
              
              const dateStr = format(day, 'yyyy-MM-dd');
              const pnl = pnlByDay.get(dateStr) || 0;
              
              return (
                <div
                  key={dateStr}
                  className="w-3 h-3 rounded-sm"
                  style={getCellStyle(pnl)}
                  title={`${dateStr}: $${pnl.toFixed(2)}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--depth)' }} />
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--profit-glow)' }} />
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--profit-500)' }} />
        <span>More</span>
      </div>
    </div>
  );
}
