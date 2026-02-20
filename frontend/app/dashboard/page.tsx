"use client";

import AchievementBadge from "@/components/AchievementBadge";
import TrialBanner from "@/components/billing/TrialBanner";
import AppShell from "@/components/layout/AppShell";
import SharePerformanceCard from "@/components/SharePerformanceCard";
import StatsCard from "@/components/StatsCard";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface PortfolioData {
  balance: string;
  equity: string;
  total_unrealized_pnl: string;
  total_realized_pnl: string;
  positions: Record<string, PositionData>;
  open_position_count: number;
}

interface PositionData {
  symbol: string;
  side: string;
  qty: string;
  entry_price: string;
  current_price: string;
  unrealized_pnl: string;
  roi_percent: string;
  liquidation_price: string | null;
}

interface OrderHistoryEntry {
  id: string;
  symbol: string;
  side: string;
  qty: string;
  filled_price: string | null;
  pnl: string | null;
  status: string;
  created_at: string;
}

interface PortfolioStats {
  win_rate?: number;
  sharpe_ratio?: number;
  max_drawdown?: number;
  daily_pnl?: number;
  equity_curve?: { date: string; equity: number }[];
}

interface StreakData {
  current_streak?: number;
  longest_streak?: number;
  xp?: number;
  level?: number;
}

interface Achievement {
  type: string;
  name: string;
  description: string;
  xp: number;
  unlocked: boolean;
  unlocked_at?: string;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function DashboardPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [dateTime, setDateTime] = useState<{ date: string; time: string } | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const { user, checkAuth } = useAuthStore();
  const analyticsGate = useFeatureGate("advanced_analytics");

  useEffect(() => {
    const init = async () => {
      const isValid = await checkAuth();
      if (!isValid) { router.replace("/landing?auth=login"); return; }
      setIsChecking(false);
    };
    init();

    const updateDateTime = () => {
      setDateTime({
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
      });
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, [checkAuth, router]);

  /* ---- Data queries ---- */

  const { data: portfolio } = useQuery<PortfolioData>({
    queryKey: ["portfolio"],
    queryFn: async () => {
      const res = await apiFetch("/api/trading/portfolio");
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      return res.json();
    },
    enabled: !isChecking,
    refetchInterval: 10_000,
  });

  const { data: recentOrders } = useQuery<OrderHistoryEntry[]>({
    queryKey: ["orderHistory"],
    queryFn: async () => {
      const res = await apiFetch("/api/trading/orders/history?limit=5");
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled: !isChecking,
  });

  const { data: portfolioStats } = useQuery<PortfolioStats>({
    queryKey: ["portfolio-stats"],
    queryFn: async () => {
      const res = await apiFetch("/api/portfolio/stats");
      if (!res.ok) return {};
      return res.json();
    },
    enabled: !isChecking,
    retry: false,
  });

  const { data: streakData } = useQuery<StreakData>({
    queryKey: ["gamification-streak"],
    queryFn: async () => {
      const res = await apiFetch("/api/gamification/streak");
      if (!res.ok) return {};
      return res.json();
    },
    enabled: !isChecking,
    retry: false,
  });

  const { data: achievements } = useQuery<Achievement[]>({
    queryKey: ["gamification-achievements"],
    queryFn: async () => {
      const res = await apiFetch("/api/gamification/achievements");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !isChecking,
    retry: false,
  });

  /* ---- Loading ---- */

  if (isChecking) {
    return (
      <div className="loading-screen">
        <div className="t0-spinner" />
      </div>
    );
  }

  /* ---- Derived values ---- */

  const balance = parseFloat(portfolio?.balance || "10000");
  const equity = parseFloat(portfolio?.equity || "10000");
  const unrealizedPnl = parseFloat(portfolio?.total_unrealized_pnl || "0");
  const realizedPnl = parseFloat(portfolio?.total_realized_pnl || "0");
  const baseBalance = balance - unrealizedPnl;

  const positions = portfolio?.positions
    ? Object.values(portfolio.positions).filter((p) => parseFloat(p.qty) > 0)
    : [];

  const winRate = portfolioStats?.win_rate ?? null;
  const dailyPnl = portfolioStats?.daily_pnl ?? unrealizedPnl + realizedPnl;
  const equityCurve = portfolioStats?.equity_curve || [];

  return (
    <AppShell>
      <div className="max-w-[1600px] mx-auto p-6">
        {/* Trial Banner */}
        <div className="mb-4">
          <TrialBanner />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-dark-50 mb-1">Dashboard</h1>
            <span className="text-sm text-dark-500 font-mono">
              {dateTime ? `${dateTime.date} \u00B7 ${dateTime.time} UTC` : "Loading..."}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShareModalOpen(true)}
              className="t0-btn t0-btn-ghost t0-btn-sm flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Share Performance
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
              <span className="text-[11px] font-bold text-primary-400 uppercase tracking-wider">Markets Open</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
          <StatsCard
            title="Balance"
            value={`$${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          />
          <StatsCard
            title="Equity"
            value={`$${equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            change={baseBalance > 0 ? (unrealizedPnl / baseBalance) * 100 : undefined}
          />
          <StatsCard
            title="Daily P&L"
            value={`${dailyPnl >= 0 ? "+" : ""}$${Math.abs(dailyPnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            change={dailyPnl !== 0 && baseBalance > 0 ? (dailyPnl / baseBalance) * 100 : undefined}
          />
          <StatsCard
            title="Win Rate"
            value={winRate !== null ? `${(winRate * 100).toFixed(1)}%` : "--"}
            subtitle={winRate !== null ? "Last 30 days" : "No data yet"}
          />
          <StatsCard
            title="Sharpe Ratio"
            value={portfolioStats?.sharpe_ratio?.toFixed(2) ?? "--"}
            locked={!analyticsGate.hasAccess}
            featureName="advanced_analytics"
          />
          <StatsCard
            title="Max Drawdown"
            value={portfolioStats?.max_drawdown !== undefined ? `${(portfolioStats.max_drawdown * 100).toFixed(1)}%` : "--"}
            locked={!analyticsGate.hasAccess}
            featureName="advanced_analytics"
          />
        </div>

        {/* Main Grid: Equity Curve + Open Positions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Equity Curve */}
          <div className="lg:col-span-2 glass-panel p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-dark-100">Portfolio Equity</h2>
            </div>
            <div className="h-64 w-full">
              {equityCurve.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: "#1a1a2e" }}
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: "#1a1a2e" }}
                      tickFormatter={(v: number) => `$${v.toLocaleString()}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0d0d1a",
                        border: "1px solid #1a1a2e",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "#64748b" }}
                      formatter={(v: number) => [`$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Equity"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="equity"
                      stroke="#11d473"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="relative h-full w-full">
                  <svg viewBox="0 0 500 150" className="w-full h-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(17, 212, 115, 0.2)" />
                        <stop offset="100%" stopColor="rgba(17, 212, 115, 0)" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,120 C30,110 60,100 90,95 C120,90 150,85 180,70 C210,55 240,65 270,50 C300,35 330,45 360,30 C390,15 420,25 450,20 L500,15 L500,150 L0,150 Z"
                      fill="url(#equityGrad)"
                    />
                    <path
                      d="M0,120 C30,110 60,100 90,95 C120,90 150,85 180,70 C210,55 240,65 270,50 C300,35 330,45 360,30 C390,15 420,25 450,20 L500,15"
                      fill="none"
                      stroke="#11d473"
                      strokeWidth="2"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-dark-600">Trade to see your equity curve</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Positions */}
          <div className="glass-panel p-6">
            <h2 className="text-base font-bold text-dark-100 mb-4">Active Positions</h2>
            <div className="space-y-3">
              {positions.length > 0 ? (
                positions.map((pos) => {
                  const pnl = parseFloat(pos.unrealized_pnl);
                  const roi = parseFloat(pos.roi_percent);
                  const isPositive = pnl >= 0;
                  const symbolShort = pos.symbol.split("-")[0];
                  return (
                    <div key={pos.symbol} className="flex items-center justify-between p-3 rounded-xl bg-t0-void/40 border border-white/[0.04]">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-dark-100">{symbolShort}</span>
                        <span className={`t0-badge text-[9px] ${pos.side === "BUY" ? "t0-badge-profit" : "t0-badge-loss"}`}>
                          {pos.side === "BUY" ? "LONG" : "SHORT"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`font-mono text-sm font-semibold ${isPositive ? "text-profit-400" : "text-loss-400"}`}>
                          {isPositive ? "+" : ""}${pnl.toFixed(2)}
                        </span>
                        <span className={`block font-mono text-[10px] ${isPositive ? "text-profit-400/60" : "text-loss-400/60"}`}>
                          {isPositive ? "+" : ""}{roi.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-dark-500 text-sm">No open positions</div>
              )}
            </div>
            <button onClick={() => router.push("/trade")} className="w-full mt-4 t0-btn t0-btn-primary t0-btn-sm">
              Open New Trade
            </button>
          </div>
        </div>

        {/* Bottom: Recent Trades + Streaks & Achievements */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Trades */}
          <div className="lg:col-span-2 glass-panel p-6">
            <h2 className="text-base font-bold text-dark-100 mb-4">Recent Orders</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {["Symbol", "Side", "Qty", "Fill Price", "Status", "Time"].map((h) => (
                      <th key={h} className="pb-3 text-[11px] font-semibold text-dark-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOrders && recentOrders.length > 0 ? (
                    recentOrders.map((order) => (
                      <tr key={order.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 font-mono text-sm font-semibold text-dark-100">{order.symbol}</td>
                        <td className="py-3">
                          <span className={`t0-badge text-[9px] ${order.side === "BUY" ? "t0-badge-profit" : "t0-badge-loss"}`}>
                            {order.side === "BUY" ? "LONG" : "SHORT"}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-sm text-dark-400">{parseFloat(order.qty).toFixed(4)}</td>
                        <td className="py-3 font-mono text-sm text-dark-400">
                          {order.filled_price ? `$${parseFloat(order.filled_price).toLocaleString()}` : "-"}
                        </td>
                        <td className="py-3 text-xs text-dark-500">{order.status}</td>
                        <td className="py-3 text-xs text-dark-500">
                          {new Date(order.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-dark-500 text-sm">No recent orders</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Streak + Achievements */}
          <div className="glass-panel p-6">
            <h2 className="text-base font-bold text-dark-100 mb-4">Streaks & Achievements</h2>

            {/* Streak info */}
            <div className="flex items-center gap-4 mb-6 p-3 rounded-xl bg-t0-void/40 border border-white/[0.04]">
              <div className="text-center">
                <span className="block font-mono text-2xl font-bold text-amber-400">
                  {streakData?.current_streak ?? 0}
                </span>
                <span className="text-2xs text-dark-500 uppercase tracking-wider">Day Streak</span>
              </div>
              <div className="w-px h-10 bg-white/[0.06]" />
              <div className="text-center">
                <span className="block font-mono text-2xl font-bold text-primary-400">
                  {streakData?.xp ?? 0}
                </span>
                <span className="text-2xs text-dark-500 uppercase tracking-wider">Total XP</span>
              </div>
              <div className="w-px h-10 bg-white/[0.06]" />
              <div className="text-center">
                <span className="block font-mono text-2xl font-bold text-lavender-400">
                  {streakData?.level ?? 1}
                </span>
                <span className="text-2xs text-dark-500 uppercase tracking-wider">Level</span>
              </div>
            </div>

            {/* Achievement badges */}
            <div className="flex flex-wrap gap-3">
              {achievements && achievements.length > 0 ? (
                achievements.map((a) => (
                  <AchievementBadge
                    key={a.type}
                    type={a.type}
                    name={a.name}
                    description={a.description}
                    xp={a.xp}
                    unlocked={a.unlocked}
                    unlockedAt={a.unlocked_at}
                    size="small"
                  />
                ))
              ) : (
                <div className="w-full text-center py-4 text-dark-500 text-sm">
                  Start trading to earn achievements
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Share Performance Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4">
            <SharePerformanceCard
              username={user?.email?.split("@")[0] || "trader"}
              returnPercent={baseBalance > 0 ? ((equity - 10000) / 10000) * 100 : 0}
              streakDays={streakData?.current_streak ?? 0}
              topAsset={positions.length > 0 ? positions[0].symbol : "BTC-USDT"}
              onClose={() => setShareModalOpen(false)}
            />
          </div>
        </div>
      )}
    </AppShell>
  );
}
