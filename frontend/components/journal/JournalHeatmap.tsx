"use client";

import { eachDayOfInterval, format, subDays } from 'date-fns';
import { useEffect, useState } from 'react';

interface JournalEntry {
  id: string;
  pnl: number;
  exit_time: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

  const getIntensityClass = (pnl: number) => {
    if (pnl === 0) return 'bg-[#161b22]'; // Empty
    if (pnl > 0) {
      if (pnl > 1000) return 'bg-emerald-500';
      if (pnl > 500) return 'bg-emerald-600';
      if (pnl > 100) return 'bg-emerald-700';
      return 'bg-emerald-900/50';
    } else {
      if (pnl < -1000) return 'bg-red-500';
      if (pnl < -500) return 'bg-red-600';
      if (pnl < -100) return 'bg-red-700';
      return 'bg-red-900/50';
    }
  };

  if (isLoading) {
    return <div className="h-32 flex items-center justify-center text-gray-500">Loading heatmap...</div>;
  }

  return (
    <div className="p-4 bg-[#0d1117] rounded-xl border border-[#30363d]">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Trading Activity (Last Year)</h3>
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
                  className={`w-3 h-3 rounded-sm ${getIntensityClass(pnl)}`}
                  title={`${dateStr}: $${pnl.toFixed(2)}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
        <span>Less</span>
        <div className="w-3 h-3 bg-[#161b22] rounded-sm" />
        <div className="w-3 h-3 bg-emerald-900/50 rounded-sm" />
        <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
        <span>More</span>
      </div>
    </div>
  );
}
