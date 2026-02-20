"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import CoachingInsight from "@/components/CoachingInsight";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";

interface CoachingEntry {
  trade_id: string;
  symbol: string;
  side: string;
  entry_price: number;
  exit_price: number;
  pnl: number;
  pnl_percent: number;
  entry_time: string | null;
  exit_time: string | null;
  qty: number;
  insight_text: string | null;
  model: string | null;
}

export default function CoachingPage() {
  const router = useRouter();
  const { user, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const init = async () => {
      const isValid = await checkAuth();
      if (!isValid) {
        router.replace("/landing?auth=login");
        return;
      }
      setIsChecking(false);
    };
    init();
  }, [checkAuth, router]);

  const isProUser =
    user?.tier === "PRO" ||
    user?.tier === "pro" ||
    user?.tier === "ELITE" ||
    user?.tier === "PROP_CHALLENGE";

  const { data: feed, isLoading: feedLoading } = useQuery<CoachingEntry[]>({
    queryKey: ["coachingFeed"],
    queryFn: async () => {
      const res = await apiFetch("/api/coaching/feed?limit=20");
      if (res.status === 403) return [];
      if (!res.ok) throw new Error("Failed to fetch coaching feed");
      return res.json();
    },
    enabled: !isChecking && isProUser,
  });

  if (isChecking) {
    return (
      <div className="loading-screen">
        <div className="t0-spinner" />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="max-w-[900px] mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 border border-primary-500/20">
            <Sparkles className="h-5 w-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark-50">AI Trade Coach</h1>
            <p className="text-sm text-dark-500">
              Personalized insights powered by Claude AI
            </p>
          </div>
        </div>

        {!isProUser ? (
          /* Pro upsell */
          <div className="rounded-2xl border border-primary-500/20 bg-primary-500/[0.04] p-8 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-primary-400 mb-4" />
            <h2 className="text-xl font-bold text-dark-100 mb-2">
              Unlock AI Trade Coaching
            </h2>
            <p className="text-sm text-dark-400 mb-6 max-w-md mx-auto">
              Get personalized AI-powered analysis on every trade you make.
              Understand what went right, what went wrong, and how to improve.
            </p>
            <button
              onClick={() => router.push("/pricing")}
              className="t0-btn t0-btn-primary"
            >
              Upgrade to Pro
            </button>
          </div>
        ) : feedLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-dark-700/40 bg-dark-900/60 p-5"
              >
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded bg-dark-700/50 animate-pulse" />
                  <div className="h-3 w-full rounded bg-dark-700/50 animate-pulse" />
                  <div className="h-3 w-4/5 rounded bg-dark-700/50 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : feed && feed.length > 0 ? (
          <div className="space-y-4">
            {feed.map((entry) => (
              <CoachingInsight
                key={entry.trade_id}
                tradeId={entry.trade_id}
                symbol={entry.symbol}
                pnl={entry.pnl}
                pnlPercent={entry.pnl_percent}
                insightText={entry.insight_text}
                isProUser={isProUser}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dark-700/40 bg-dark-900/60 p-12 text-center">
            <p className="text-dark-400 text-sm">
              Execute your first trade to get AI coaching insights.
            </p>
            <button
              onClick={() => router.push("/trade")}
              className="mt-4 t0-btn t0-btn-primary t0-btn-sm"
            >
              Open Trade
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
