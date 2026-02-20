"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useAuthStore } from "@/stores/authStore";
import { API_BASE } from "@/lib/runtimeConfig";

interface Pool {
  pool_id: string;
  token_a: string;
  token_b: string;
  reserve_a: number;
  reserve_b: number;
  price_a_in_b: number;
  total_liquidity: number;
  apy: number;
  fee_rate: number;
}

interface Position {
  position_id: string;
  pool_id: string;
  token_a: string;
  token_b: string;
  amount_a_deposited: number;
  amount_b_deposited: number;
  lp_tokens: number;
  entry_price: number;
  deposited_at: string;
  current_price: number;
  impermanent_loss_pct: number;
  yield_earned_usd: number;
  apy: number;
}

interface ILResult {
  impermanent_loss_pct: number;
  price_ratio: number;
  hodl_value: number;
  pool_value: number;
}

export default function DeFiPage() {
  const router = useRouter();
  const { token, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<"pools" | "positions" | "calculator">("pools");

  // Pool data
  const [pools, setPools] = useState<Pool[]>([]);
  const [selectedPool, setSelectedPool] = useState<string>("");
  const [amountA, setAmountA] = useState("0.1");
  const [amountB, setAmountB] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addMsg, setAddMsg] = useState("");

  // Positions
  const [positions, setPositions] = useState<Position[]>([]);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  // IL Calculator
  const [ilEntry, setIlEntry] = useState("50000");
  const [ilCurrent, setIlCurrent] = useState("75000");
  const [ilResult, setIlResult] = useState<ILResult | null>(null);

  // Swap quote
  const [swapPool, setSwapPool] = useState("");
  const [swapAmount, setSwapAmount] = useState("0.01");
  const [swapToken, setSwapToken] = useState("BTC");
  const [swapQuote, setSwapQuote] = useState<{ amount_out: number; token_out: string; price_impact_pct: number; fee_paid: number; token_in: string } | null>(null);

  useEffect(() => {
    const run = async () => {
      const ok = await checkAuth();
      if (!ok) {
        router.replace("/landing?auth=login");
        return;
      }
      setIsChecking(false);
      fetchPools();
      fetchPositions();
    };
    run();
  }, [checkAuth, router]);

  async function fetchPools() {
    try {
      const res = await fetch(`${API_BASE}/api/defi/pools`);
      const data = await res.json();
      setPools(data.pools || []);
    } catch {
      // Silently handle
    }
  }

  async function fetchPositions() {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/defi/positions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPositions(data.positions || []);
    } catch {
      // Silently handle
    }
  }

  async function handleAddLiquidity() {
    if (!selectedPool || !amountA || !token) return;
    setIsAdding(true);
    setAddMsg("");
    try {
      const pool = pools.find((p) => p.pool_id === selectedPool);
      const autoB = pool ? parseFloat(amountA) * pool.price_a_in_b : parseFloat(amountB);
      const res = await fetch(`${API_BASE}/api/defi/liquidity/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: selectedPool,
          amount_a: parseFloat(amountA),
          amount_b: autoB,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setAddMsg(`✓ Added liquidity! LP tokens: ${data.position?.lp_tokens?.toFixed(4)}`);
      fetchPositions();
    } catch (err) {
      setAddMsg(err instanceof Error ? err.message : "Error adding liquidity");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemoveLiquidity(positionId: string) {
    if (!token) return;
    setIsRemoving(positionId);
    try {
      const res = await fetch(`${API_BASE}/api/defi/liquidity/${positionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      fetchPositions();
    } catch {
      // Silently handle
    } finally {
      setIsRemoving(null);
    }
  }

  async function calculateIL() {
    try {
      const res = await fetch(`${API_BASE}/api/defi/calculator/il`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_price: parseFloat(ilEntry),
          current_price: parseFloat(ilCurrent),
        }),
      });
      const data = await res.json();
      setIlResult(data);
    } catch {
      // Silently handle
    }
  }

  async function getSwapQuote() {
    if (!swapPool) return;
    try {
      const res = await fetch(`${API_BASE}/api/defi/swap/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pool_id: swapPool,
          token_in: swapToken,
          amount_in: parseFloat(swapAmount),
        }),
      });
      const data = await res.json();
      setSwapQuote(data);
    } catch {
      // Silently handle
    }
  }

  // Auto-fill token B when amount A changes
  useEffect(() => {
    if (selectedPool && amountA) {
      const pool = pools.find((p) => p.pool_id === selectedPool);
      if (pool) {
        setAmountB((parseFloat(amountA) * pool.price_a_in_b).toFixed(2));
      }
    }
  }, [selectedPool, amountA, pools]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-t0-void">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const tabs = [
    { id: "pools", label: "Liquidity Pools" },
    { id: "positions", label: `My Positions (${positions.length})` },
    { id: "calculator", label: "IL Calculator" },
  ] as const;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl p-6 md:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark-100">DeFi Simulator</h1>
            <p className="mt-1 text-sm text-dark-400">
              Simulate AMM liquidity provision, impermanent loss, and yield farming.
            </p>
          </div>
          <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400 border border-purple-500/20">
            Educational Simulation
          </span>
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

        {/* Pools Tab */}
        {activeTab === "pools" && (
          <div className="space-y-6">
            {/* Pool list */}
            <div className="grid gap-4 sm:grid-cols-2">
              {pools.map((pool) => (
                <div
                  key={pool.pool_id}
                  className={`rounded-2xl border p-5 cursor-pointer transition-all ${
                    selectedPool === pool.pool_id
                      ? "border-primary-500/50 bg-primary-500/5"
                      : "border-dark-700/40 bg-dark-900 hover:border-dark-600"
                  }`}
                  onClick={() => setSelectedPool(pool.pool_id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-dark-100">
                        {pool.token_a}/{pool.token_b}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-green-400">
                      {pool.apy.toFixed(1)}% APY
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-dark-500">Price</p>
                      <p className="font-mono text-dark-200">
                        ${pool.price_a_in_b.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-dark-500">Fee</p>
                      <p className="font-mono text-dark-200">{(pool.fee_rate * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-dark-500">Reserve {pool.token_a}</p>
                      <p className="font-mono text-dark-200">
                        {pool.reserve_a.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-dark-500">Reserve {pool.token_b}</p>
                      <p className="font-mono text-dark-200">
                        ${(pool.reserve_b / 1e6).toFixed(1)}M
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Liquidity */}
            {selectedPool && (
              <div className="rounded-2xl border border-dark-700/40 bg-dark-900 p-6">
                <h2 className="mb-4 text-base font-semibold text-dark-100">Add Liquidity</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm text-dark-400">
                      Amount {pools.find((p) => p.pool_id === selectedPool)?.token_a}
                    </label>
                    <input
                      type="number"
                      value={amountA}
                      onChange={(e) => setAmountA(e.target.value)}
                      className="w-full rounded-lg border border-dark-700 bg-t0-void px-3 py-2.5 font-mono text-sm text-dark-100 focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm text-dark-400">
                      Amount {pools.find((p) => p.pool_id === selectedPool)?.token_b} (auto)
                    </label>
                    <input
                      type="number"
                      value={amountB}
                      readOnly
                      className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2.5 font-mono text-sm text-dark-400 focus:outline-none"
                    />
                  </div>
                </div>
                {addMsg && (
                  <p className={`mt-3 text-sm ${addMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>
                    {addMsg}
                  </p>
                )}
                <button
                  onClick={handleAddLiquidity}
                  disabled={isAdding}
                  className="mt-4 rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
                >
                  {isAdding ? "Adding..." : "Add Liquidity"}
                </button>
              </div>
            )}

            {/* Swap Quote */}
            <div className="rounded-2xl border border-dark-700/40 bg-dark-900 p-6">
              <h2 className="mb-4 text-base font-semibold text-dark-100">Swap Quote</h2>
              <div className="flex flex-wrap gap-3">
                <select
                  value={swapPool}
                  onChange={(e) => setSwapPool(e.target.value)}
                  className="rounded-lg border border-dark-700 bg-t0-void px-3 py-2 text-sm text-dark-100 focus:border-primary-500 focus:outline-none"
                >
                  <option value="">Select pool</option>
                  {pools.map((p) => (
                    <option key={p.pool_id} value={p.pool_id}>
                      {p.token_a}/{p.token_b}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={swapAmount}
                  onChange={(e) => setSwapAmount(e.target.value)}
                  placeholder="Amount in"
                  className="w-28 rounded-lg border border-dark-700 bg-t0-void px-3 py-2 font-mono text-sm text-dark-100 focus:border-primary-500 focus:outline-none"
                />
                <select
                  value={swapToken}
                  onChange={(e) => setSwapToken(e.target.value)}
                  className="rounded-lg border border-dark-700 bg-t0-void px-3 py-2 text-sm text-dark-100 focus:border-primary-500 focus:outline-none"
                >
                  {swapPool
                    ? [
                        pools.find((p) => p.pool_id === swapPool)?.token_a || "",
                        pools.find((p) => p.pool_id === swapPool)?.token_b || "",
                      ]
                        .filter(Boolean)
                        .map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))
                    : null}
                </select>
                <button
                  onClick={getSwapQuote}
                  className="rounded-lg border border-primary-500/30 bg-primary-500/10 px-4 py-2 text-sm font-semibold text-primary-400 hover:bg-primary-500/20 transition-colors"
                >
                  Get Quote
                </button>
              </div>
              {swapQuote && (
                <div className="mt-4 rounded-xl bg-dark-800/60 p-4 font-mono text-sm">
                  <div className="flex justify-between">
                    <span className="text-dark-400">Amount out:</span>
                    <span className="text-dark-100">
                      {swapQuote.amount_out?.toFixed(6)} {swapQuote.token_out}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-dark-400">Price impact:</span>
                    <span className={swapQuote.price_impact_pct > 1 ? "text-red-400" : "text-green-400"}>
                      {swapQuote.price_impact_pct?.toFixed(3)}%
                    </span>
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-dark-400">Fee:</span>
                    <span className="text-dark-300">
                      {swapQuote.fee_paid?.toFixed(6)} {swapQuote.token_in}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Positions Tab */}
        {activeTab === "positions" && (
          <div>
            {positions.length === 0 ? (
              <div className="rounded-2xl border border-dark-700/40 bg-dark-900 p-12 text-center">
                <p className="text-dark-400">No active liquidity positions.</p>
                <button
                  onClick={() => setActiveTab("pools")}
                  className="mt-4 rounded-lg bg-primary-500/10 px-4 py-2 text-sm font-medium text-primary-400 hover:bg-primary-500/20 transition-colors"
                >
                  Add Liquidity →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {positions.map((pos) => (
                  <div
                    key={pos.position_id}
                    className="rounded-2xl border border-dark-700/40 bg-dark-900 p-5"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-mono text-sm font-bold text-dark-100">
                          {pos.token_a}/{pos.token_b}
                        </p>
                        <p className="text-xs text-dark-500">
                          Since {new Date(pos.deposited_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveLiquidity(pos.position_id)}
                        disabled={isRemoving === pos.position_id}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                      >
                        {isRemoving === pos.position_id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
                      <div>
                        <p className="text-xs text-dark-500">Deposited {pos.token_a}</p>
                        <p className="font-mono text-dark-200">
                          {pos.amount_a_deposited.toFixed(4)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-dark-500">Deposited {pos.token_b}</p>
                        <p className="font-mono text-dark-200">
                          ${pos.amount_b_deposited.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-dark-500">Impermanent Loss</p>
                        <p className={`font-mono ${pos.impermanent_loss_pct < -0.5 ? "text-red-400" : "text-dark-200"}`}>
                          {pos.impermanent_loss_pct.toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-dark-500">Yield Earned</p>
                        <p className="font-mono text-green-400">
                          +${pos.yield_earned_usd.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* IL Calculator Tab */}
        {activeTab === "calculator" && (
          <div className="rounded-2xl border border-dark-700/40 bg-dark-900 p-6">
            <h2 className="mb-2 text-base font-semibold text-dark-100">
              Impermanent Loss Calculator
            </h2>
            <p className="mb-6 text-sm text-dark-400">
              IL = 2√r/(1+r) − 1, where r = current/entry price ratio.
              Compare providing liquidity vs. simply holding (HODLing).
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm text-dark-400">
                  Entry price (USD)
                </label>
                <input
                  type="number"
                  value={ilEntry}
                  onChange={(e) => setIlEntry(e.target.value)}
                  className="w-full rounded-lg border border-dark-700 bg-t0-void px-3 py-2.5 font-mono text-sm text-dark-100 focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-dark-400">
                  Current price (USD)
                </label>
                <input
                  type="number"
                  value={ilCurrent}
                  onChange={(e) => setIlCurrent(e.target.value)}
                  className="w-full rounded-lg border border-dark-700 bg-t0-void px-3 py-2.5 font-mono text-sm text-dark-100 focus:border-primary-500 focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={calculateIL}
              className="mt-4 rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
            >
              Calculate
            </button>

            {ilResult && (
              <div className="mt-6 rounded-xl bg-dark-800/60 p-5">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-center">
                  <div>
                    <p className="text-xs text-dark-500 uppercase tracking-wider">Price Ratio</p>
                    <p className="mt-1 font-mono text-xl font-bold text-dark-100">
                      {ilResult.price_ratio.toFixed(2)}×
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500 uppercase tracking-wider">IL</p>
                    <p className={`mt-1 font-mono text-xl font-bold ${ilResult.impermanent_loss_pct < -0.5 ? "text-red-400" : "text-yellow-400"}`}>
                      {ilResult.impermanent_loss_pct.toFixed(3)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500 uppercase tracking-wider">HODL Value</p>
                    <p className="mt-1 font-mono text-xl font-bold text-dark-100">
                      {ilResult.hodl_value.toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500 uppercase tracking-wider">Pool Value</p>
                    <p className="mt-1 font-mono text-xl font-bold text-dark-100">
                      {ilResult.pool_value.toFixed(4)}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-center text-xs text-dark-400">
                  {Math.abs(ilResult.impermanent_loss_pct) < 0.5
                    ? "✓ Minimal IL — good range to provide liquidity"
                    : ilResult.impermanent_loss_pct < -5
                    ? "⚠️ High IL — fees earned must exceed this to be profitable"
                    : "⚠️ Moderate IL — monitor your position closely"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
