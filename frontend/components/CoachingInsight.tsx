"use client";

import { Sparkles, Lock } from "lucide-react";

interface CoachingInsightProps {
  tradeId: string;
  symbol: string;
  pnl: number;
  pnlPercent: number;
  insightText?: string | null;
  isLoading?: boolean;
  isProUser?: boolean;
}

export default function CoachingInsight({
  tradeId: _tradeId,
  symbol,
  pnl,
  pnlPercent,
  insightText,
  isLoading,
  isProUser = true,
}: CoachingInsightProps) {
  const isPositive = pnl >= 0;

  if (!isProUser && !insightText) {
    return (
      <div className="rounded-xl border border-dark-700/40 bg-dark-900/60 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-dark-100">
              {symbol}
            </span>
            <span
              className={`font-mono text-sm font-semibold ${isPositive ? "text-profit-400" : "text-loss-400"}`}
            >
              {isPositive ? "+" : ""}${Math.abs(pnl).toFixed(2)} ({pnlPercent.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-dark-800/50 p-4">
          <Lock className="h-5 w-5 text-dark-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-dark-300">Pro Feature</p>
            <p className="text-xs text-dark-500">
              Upgrade to Pro to get AI-powered coaching insights on every trade.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dark-700/40 bg-dark-900/60 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-dark-100">
            {symbol}
          </span>
          <span
            className={`font-mono text-sm font-semibold ${isPositive ? "text-profit-400" : "text-loss-400"}`}
          >
            {isPositive ? "+" : ""}${Math.abs(pnl).toFixed(2)} ({pnlPercent.toFixed(2)}%)
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-primary-500/10 px-2.5 py-1">
          <Sparkles className="h-3.5 w-3.5 text-primary-400" />
          <span className="text-[10px] font-bold text-primary-400 uppercase tracking-wider">
            AI Insight
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-dark-700/50 animate-pulse" />
          <div className="h-3 w-4/5 rounded bg-dark-700/50 animate-pulse" />
          <div className="h-3 w-3/5 rounded bg-dark-700/50 animate-pulse" />
        </div>
      ) : insightText ? (
        <p className="text-sm text-dark-300 leading-relaxed">{insightText}</p>
      ) : (
        <p className="text-sm text-dark-500 italic">
          Insight generating... Check back in a moment.
        </p>
      )}
    </div>
  );
}
