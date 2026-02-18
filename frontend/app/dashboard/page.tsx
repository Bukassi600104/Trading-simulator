"use client";

import AppShell from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

export default function DashboardPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [dateTime, setDateTime] = useState<{ date: string; time: string } | null>(null);
  const { checkAuth } = useAuthStore();

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

  if (isChecking) {
    return (
      <div className="loading-screen">
        <div className="t0-spinner" />
      </div>
    );
  }

  const balance = parseFloat(portfolio?.balance || "10000");
  const equity = parseFloat(portfolio?.equity || "10000");
  const unrealizedPnl = parseFloat(portfolio?.total_unrealized_pnl || "0");
  const realizedPnl = parseFloat(portfolio?.total_realized_pnl || "0");
  const pnlPositive = unrealizedPnl >= 0;
  const baseBalance = balance - unrealizedPnl;

  const positions = portfolio?.positions
    ? Object.values(portfolio.positions).filter((p) => parseFloat(p.qty) > 0)
    : [];

  const stats = [
    {
      label: "Portfolio Value",
      value: `$${equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      change: baseBalance > 0
        ? `${pnlPositive ? "+" : ""}${((unrealizedPnl / baseBalance) * 100).toFixed(1)}%`
        : null,
      positive: pnlPositive,
      accent: "primary",
    },
    {
      label: "Unrealized P&L",
      value: `${pnlPositive ? "+" : ""}$${Math.abs(unrealizedPnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      change: null,
      positive: pnlPositive,
      accent: pnlPositive ? "primary" : "coral",
    },
    {
      label: "Realized P&L",
      value: `${realizedPnl >= 0 ? "+" : ""}$${Math.abs(realizedPnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      change: null,
      positive: realizedPnl >= 0,
      accent: realizedPnl >= 0 ? "primary" : "coral",
    },
    {
      label: "Open Positions",
      value: `${portfolio?.open_position_count ?? 0}`,
      change: null,
      positive: true,
      accent: "lavender",
    },
  ];

  return (
    <AppShell>
      <div className="max-w-[1600px] mx-auto p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-dark-50 mb-1">Dashboard</h1>
            <span className="text-sm text-dark-500 font-mono">
              {dateTime ? `${dateTime.date} · ${dateTime.time} UTC` : "Loading..."}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
              <span className="text-[11px] font-bold text-primary-400 uppercase tracking-wider">Markets Open</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <div key={i} className="relative glass-panel p-5 overflow-hidden group">
              <div className={`absolute top-0 left-0 w-1 h-full ${
                stat.accent === "primary" ? "bg-primary-500" :
                stat.accent === "coral" ? "bg-coral-500" :
                stat.accent === "amber" ? "bg-amber-400" :
                "bg-lavender-500"
              }`} />
              <span className="text-xs font-medium text-dark-500 uppercase tracking-wider">{stat.label}</span>
              <div className="flex items-baseline gap-3 mt-2">
                <span className={`font-mono text-2xl font-bold ${stat.positive ? "text-dark-50" : "text-coral-400"}`}>
                  {stat.value}
                </span>
                {stat.change && (
                  <span className={`text-xs font-semibold font-mono px-2 py-0.5 rounded-md ${
                    stat.positive ? "text-primary-400 bg-primary-500/10" : "text-coral-400 bg-coral-500/10"
                  }`}>
                    {stat.change}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid: Equity + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Equity Curve */}
          <div className="lg:col-span-2 glass-panel p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-dark-100">Portfolio Equity</h2>
              <div className="flex gap-1">
                {["1D", "1W", "1M", "All"].map((tf) => (
                  <button key={tf} className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    tf === "1M" ? "bg-primary-500/15 text-primary-400" : "text-dark-500 hover:text-dark-300"
                  }`}>
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            {/* Simplified equity curve viz */}
            <div className="relative h-48 w-full">
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
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[10px] text-dark-600 font-mono">
                <span>Jan 12</span><span>Jan 19</span><span>Jan 26</span><span>Feb 2</span><span>Feb 9</span>
              </div>
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

        {/* Bottom: Recent Trades */}
        <div className="grid grid-cols-1 gap-6">
          <div className="glass-panel p-6">
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
        </div>
      </div>
    </AppShell>
  );
}
