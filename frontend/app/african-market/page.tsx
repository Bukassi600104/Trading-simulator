"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useAuthStore } from "@/stores/authStore";
import { API_BASE } from "@/lib/runtimeConfig";

interface PricesData {
  prices_ngn: Record<string, number>;
  prices_usd: Record<string, number>;
  usd_ngn_rate: number;
}

interface DevalHistoryItem {
  year: number;
  rate: number;
  event: string;
}

interface SimResult {
  amount_ngn_original: number;
  entry_year: number;
  exit_year: number;
  entry_rate: number;
  exit_rate: number;
  amount_usd: number;
  amount_ngn_today: number;
  depreciation_pct: number;
  purchasing_power_loss_pct: number;
  btc_comparison: {
    btc_price_entry_usd: number;
    btc_price_exit_usd: number;
    btc_return_pct: number;
  };
}

export default function AfricanMarketPage() {
  const router = useRouter();
  const { checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<"prices" | "simulator" | "history">("prices");

  const [pricesData, setPricesData] = useState<PricesData | null>(null);
  const [history, setHistory] = useState<DevalHistoryItem[]>([]);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Sim inputs
  const [amount, setAmount] = useState("1000000");
  const [entryYear, setEntryYear] = useState("2019");
  const [exitYear, setExitYear] = useState("2024");

  useEffect(() => {
    const run = async () => {
      const ok = await checkAuth();
      if (!ok) {
        router.replace("/landing?auth=login");
        return;
      }
      setIsChecking(false);
      fetchPrices();
      fetchHistory();
    };
    run();
  }, [checkAuth, router]);

  async function fetchPrices() {
    try {
      const res = await fetch(`${API_BASE}/api/african-market/prices/ngn`);
      const data = await res.json();
      setPricesData(data);
    } catch {
      // Silently handle
    }
  }

  async function fetchHistory() {
    try {
      const res = await fetch(`${API_BASE}/api/african-market/devaluation/history`);
      const data = await res.json();
      setHistory(data.history || []);
    } catch {
      // Silently handle
    }
  }

  async function runSimulation() {
    setSimLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/african-market/devaluation/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_ngn: parseFloat(amount),
          entry_year: parseInt(entryYear),
          exit_year: parseInt(exitYear),
        }),
      });
      const data = await res.json();
      setSimResult(data);
    } catch {
      // Silently handle
    } finally {
      setSimLoading(false);
    }
  }

  const formatNGN = (val: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(val);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-t0-void">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const tabs = [
    { id: "prices", label: "NGN Prices" },
    { id: "simulator", label: "Devaluation Sim" },
    { id: "history", label: "₦ History" },
  ] as const;

  const SYMBOL_EMOJIS: Record<string, string> = {
    "BTC-USDT": "₿",
    "ETH-USDT": "Ξ",
    "SOL-USDT": "◎",
    "BNB-USDT": "⬡",
    "XRP-USDT": "✕",
    "DOGE-USDT": "Ð",
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl p-6 md:p-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark-100">African Market</h1>
            <p className="mt-1 text-sm text-dark-400">
              Crypto prices in Naira, devaluation simulator, and NGN-aware trading tools.
            </p>
          </div>
          {pricesData && (
            <div className="text-right">
              <p className="text-xs text-dark-500">USD/NGN</p>
              <p className="font-mono text-lg font-bold text-dark-100">
                ₦{pricesData.usd_ngn_rate.toLocaleString("en-NG")}
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl bg-dark-800/50 p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-primary-500/20 text-primary-400"
                  : "text-dark-400 hover:text-dark-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* NGN Prices */}
        {activeTab === "prices" && (
          <div>
            {!pricesData ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(pricesData.prices_usd).map(([sym, usdPrice]) => {
                  const base = sym.split("-")[0];
                  const ngnKey = `${base}-NGN`;
                  const ngnPrice = pricesData.prices_ngn[ngnKey];
                  return (
                    <div
                      key={sym}
                      className="rounded-2xl border border-dark-700/40 bg-dark-900 p-5"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg text-dark-300">
                            {SYMBOL_EMOJIS[sym] || "•"}
                          </span>
                          <span className="font-mono font-bold text-dark-100">{base}</span>
                        </div>
                      </div>
                      <div>
                        <p className="font-mono text-2xl font-bold text-dark-100">
                          ₦{ngnPrice?.toLocaleString("en-NG", { maximumFractionDigits: 0 })}
                        </p>
                        <p className="mt-1 font-mono text-sm text-dark-400">
                          ${usdPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-4 text-xs text-dark-600">
              Prices delayed ~15 minutes. Rate: ₦{pricesData?.usd_ngn_rate?.toLocaleString("en-NG")} per $1 USD.
            </p>
          </div>
        )}

        {/* Devaluation Simulator */}
        {activeTab === "simulator" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-dark-700/40 bg-dark-900 p-6">
              <h2 className="mb-2 text-base font-semibold text-dark-100">
                Naira Devaluation Simulator
              </h2>
              <p className="mb-6 text-sm text-dark-400">
                See how much purchasing power ₦X has lost since a given year, and how Bitcoin would
                have performed by comparison.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm text-dark-400">Amount (₦)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-lg border border-dark-700 bg-t0-void px-3 py-2.5 font-mono text-sm text-dark-100 focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-dark-400">From Year</label>
                  <select
                    value={entryYear}
                    onChange={(e) => setEntryYear(e.target.value)}
                    className="w-full rounded-lg border border-dark-700 bg-t0-void px-3 py-2.5 text-sm text-dark-100 focus:border-primary-500 focus:outline-none"
                  >
                    {[2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-dark-400">To Year</label>
                  <select
                    value={exitYear}
                    onChange={(e) => setExitYear(e.target.value)}
                    className="w-full rounded-lg border border-dark-700 bg-t0-void px-3 py-2.5 text-sm text-dark-100 focus:border-primary-500 focus:outline-none"
                  >
                    {[2020, 2021, 2022, 2023, 2024, 2025].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={runSimulation}
                disabled={simLoading}
                className="mt-4 rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                {simLoading ? "Calculating..." : "Simulate"}
              </button>
            </div>

            {simResult && (
              <div className="rounded-2xl border border-dark-700/40 bg-dark-900 p-6">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-dark-400">
                  Result
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-dark-800/60 p-4">
                    <p className="text-xs text-dark-500">Original Amount ({entryYear})</p>
                    <p className="mt-1 font-mono text-xl font-bold text-dark-100">
                      {formatNGN(simResult.amount_ngn_original)}
                    </p>
                    <p className="text-xs text-dark-500 mt-1">
                      = ${simResult.amount_usd.toLocaleString()} USD at ₦{simResult.entry_rate}/$
                    </p>
                  </div>
                  <div className="rounded-xl bg-dark-800/60 p-4">
                    <p className="text-xs text-dark-500">Equivalent Today ({exitYear})</p>
                    <p className="mt-1 font-mono text-xl font-bold text-dark-100">
                      {formatNGN(simResult.amount_ngn_today)}
                    </p>
                    <p className="text-xs text-dark-500 mt-1">
                      Rate: ₦{simResult.exit_rate}/$ today
                    </p>
                  </div>
                  <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4">
                    <p className="text-xs text-dark-500">Purchasing Power Lost</p>
                    <p className="mt-1 font-mono text-xl font-bold text-red-400">
                      -{simResult.purchasing_power_loss_pct.toFixed(1)}%
                    </p>
                    <p className="text-xs text-dark-500 mt-1">
                      Naira depreciated {simResult.depreciation_pct.toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-4">
                    <p className="text-xs text-dark-500">BTC Return (same period)</p>
                    <p className="mt-1 font-mono text-xl font-bold text-green-400">
                      +{simResult.btc_comparison.btc_return_pct.toFixed(0)}%
                    </p>
                    <p className="text-xs text-dark-500 mt-1">
                      ${simResult.btc_comparison.btc_price_entry_usd.toLocaleString()} →
                      ${simResult.btc_comparison.btc_price_exit_usd.toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="mt-4 rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 text-xs text-amber-400">
                  ⚠️ Simulated comparison only. Past BTC performance does not guarantee future returns.
                  This is for educational purposes — not financial advice.
                </p>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="rounded-2xl border border-dark-700/40 bg-dark-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-700/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-dark-500">Year</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-dark-500">USD/NGN</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-dark-500 hidden sm:table-cell">Event</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/20">
                {history.map((h) => (
                  <tr key={h.year} className="hover:bg-dark-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-dark-200">{h.year}</td>
                    <td className="px-4 py-3 text-right font-mono text-dark-100">
                      ₦{h.rate.toLocaleString("en-NG")}
                    </td>
                    <td className="px-4 py-3 text-dark-400 text-xs hidden sm:table-cell">
                      {h.event}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
