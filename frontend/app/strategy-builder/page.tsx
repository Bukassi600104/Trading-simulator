"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useAuthStore } from "@/stores/authStore";
import { API_BASE } from "@/lib/runtimeConfig";

type RuleType = "indicator_cross" | "price_level" | "rsi_threshold" | "time_window";
type Indicator = "RSI" | "SMA" | "EMA" | "MACD";
type Direction = "above" | "below" | "cross_up" | "cross_down";
type Action = "buy" | "sell" | "close";

interface Rule {
  id: string;
  type: RuleType;
  indicator?: Indicator;
  period?: number;
  threshold?: number;
  direction?: Direction;
  action: Action;
  symbol?: string;
  size_pct: number;
}

interface Strategy {
  id: string;
  name: string;
  description?: string;
  rules: Rule[];
  is_active: boolean;
  is_public: boolean;
  author?: string;
  created_at: string;
  updated_at: string;
}

const SYMBOLS = ["BTC-USDT", "ETH-USDT", "SOL-USDT", "BNB-USDT", "XRP-USDT", "DOGE-USDT"];
const INDICATORS: Indicator[] = ["RSI", "SMA", "EMA", "MACD"];
const RULE_TYPES: { value: RuleType; label: string }[] = [
  { value: "rsi_threshold", label: "RSI Threshold" },
  { value: "indicator_cross", label: "Moving Average Cross" },
  { value: "price_level", label: "Price Level" },
  { value: "time_window", label: "Time Window" },
];

function newRule(): Rule {
  return {
    id: Math.random().toString(36).slice(2),
    type: "rsi_threshold",
    indicator: "RSI",
    period: 14,
    threshold: 30,
    direction: "below",
    action: "buy",
    symbol: "BTC-USDT",
    size_pct: 10,
  };
}

export default function StrategyBuilderPage() {
  const router = useRouter();
  const { token, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<"my" | "build" | "public">("my");

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [publicStrategies, setPublicStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Builder state
  const [stratName, setStratName] = useState("");
  const [stratDesc, setStratDesc] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [rules, setRules] = useState<Rule[]>([newRule()]);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    const run = async () => {
      const ok = await checkAuth();
      if (!ok) {
        router.replace("/landing?auth=login");
        return;
      }
      setIsChecking(false);
      fetchStrategies();
      fetchPublic();
    };
    run();
  }, [checkAuth, router]);

  async function fetchStrategies() {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/strategies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStrategies(data.strategies || []);
    } catch {
      // Silently handle
    }
  }

  async function fetchPublic() {
    try {
      const res = await fetch(`${API_BASE}/api/strategies/public`);
      const data = await res.json();
      setPublicStrategies(data.strategies || []);
    } catch {
      // Silently handle
    }
  }

  async function saveStrategy() {
    if (!stratName.trim() || !token) return;
    setIsLoading(true);
    setSaveMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/strategies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: stratName,
          description: stratDesc,
          rules: rules.map(({ id: _id, ...r }) => r),
          is_public: isPublic,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setSaveMsg("✓ Strategy saved successfully!");
      fetchStrategies();
      setActiveTab("my");
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleActive(s: Strategy) {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/api/strategies/${s.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !s.is_active }),
      });
      fetchStrategies();
    } catch {
      // Silently handle
    }
  }

  async function deleteStrategy(id: string) {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/api/strategies/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchStrategies();
    } catch {
      // Silently handle
    }
  }

  function addRule() {
    setRules([...rules, newRule()]);
  }

  function removeRule(id: string) {
    setRules(rules.filter((r) => r.id !== id));
  }

  function updateRule(id: string, updates: Partial<Rule>) {
    setRules(rules.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-t0-void">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const tabs = [
    { id: "my", label: `My Strategies (${strategies.length})` },
    { id: "build", label: "Build New" },
    { id: "public", label: `Community (${publicStrategies.length})` },
  ] as const;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl p-6 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark-100">Strategy Builder</h1>
          <p className="mt-1 text-sm text-dark-400">
            Create rule-based automated trading strategies with a no-code visual builder.
          </p>
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

        {/* My Strategies */}
        {activeTab === "my" && (
          <div>
            {strategies.length === 0 ? (
              <div className="rounded-2xl border border-dark-700/40 bg-dark-900 p-12 text-center">
                <p className="text-dark-400">No strategies yet.</p>
                <button
                  onClick={() => setActiveTab("build")}
                  className="mt-4 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
                >
                  Build Your First Strategy →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {strategies.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-dark-700/40 bg-dark-900 p-5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-dark-100">{s.name}</h3>
                          {s.is_public && (
                            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                              Public
                            </span>
                          )}
                          {s.is_active && (
                            <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
                              Active
                            </span>
                          )}
                        </div>
                        {s.description && (
                          <p className="mt-1 text-sm text-dark-400">{s.description}</p>
                        )}
                        <p className="mt-1.5 text-xs text-dark-500">
                          {s.rules.length} rule{s.rules.length !== 1 ? "s" : ""} ·{" "}
                          {new Date(s.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => toggleActive(s)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            s.is_active
                              ? "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                              : "border-dark-600 bg-dark-800 text-dark-400 hover:text-dark-200"
                          }`}
                        >
                          {s.is_active ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => deleteStrategy(s.id)}
                          className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-500/70 hover:border-red-500/40 hover:text-red-400 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Build New */}
        {activeTab === "build" && (
          <div className="space-y-6">
            {/* Basic info */}
            <div className="rounded-2xl border border-dark-700/40 bg-dark-900 p-6">
              <h2 className="mb-4 text-base font-semibold text-dark-100">Strategy Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm text-dark-400">Strategy Name</label>
                  <input
                    type="text"
                    value={stratName}
                    onChange={(e) => setStratName(e.target.value)}
                    placeholder="e.g. RSI Oversold + SMA200 Filter"
                    className="w-full rounded-lg border border-dark-700 bg-t0-void px-3 py-2.5 text-sm text-dark-100 placeholder-dark-600 focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-dark-400">Description (optional)</label>
                  <textarea
                    value={stratDesc}
                    onChange={(e) => setStratDesc(e.target.value)}
                    rows={2}
                    placeholder="Describe your strategy logic..."
                    className="w-full rounded-lg border border-dark-700 bg-t0-void px-3 py-2.5 text-sm text-dark-100 placeholder-dark-600 focus:border-primary-500 focus:outline-none resize-none"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded border-dark-600 bg-dark-800 text-primary-500"
                  />
                  <span className="text-sm text-dark-300">Share publicly with the community</span>
                </label>
              </div>
            </div>

            {/* Rules */}
            <div className="rounded-2xl border border-dark-700/40 bg-dark-900 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-dark-100">Rules</h2>
                <button
                  onClick={addRule}
                  className="rounded-lg border border-primary-500/30 bg-primary-500/10 px-3 py-1.5 text-xs font-semibold text-primary-400 hover:bg-primary-500/20 transition-colors"
                >
                  + Add Rule
                </button>
              </div>

              <div className="space-y-4">
                {rules.map((rule, idx) => (
                  <div
                    key={rule.id}
                    className="rounded-xl border border-dark-700/60 bg-dark-800/50 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">
                        Rule {idx + 1}
                      </span>
                      {rules.length > 1 && (
                        <button
                          onClick={() => removeRule(rule.id)}
                          className="text-xs text-red-500/60 hover:text-red-400 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {/* Rule Type */}
                      <div>
                        <label className="mb-1 block text-xs text-dark-500">Condition Type</label>
                        <select
                          value={rule.type}
                          onChange={(e) => updateRule(rule.id, { type: e.target.value as RuleType })}
                          className="w-full rounded-lg border border-dark-700 bg-t0-void px-3 py-2 text-sm text-dark-200 focus:border-primary-500 focus:outline-none"
                        >
                          {RULE_TYPES.map((rt) => (
                            <option key={rt.value} value={rt.value}>
                              {rt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Indicator */}
                      {(rule.type === "rsi_threshold" || rule.type === "indicator_cross") && (
                        <div>
                          <label className="mb-1 block text-xs text-dark-500">Indicator</label>
                          <select
                            value={rule.indicator}
                            onChange={(e) => updateRule(rule.id, { indicator: e.target.value as Indicator })}
                            className="w-full rounded-lg border border-dark-700 bg-t0-void px-3 py-2 text-sm text-dark-200 focus:border-primary-500 focus:outline-none"
                          >
                            {INDICATORS.map((i) => (
                              <option key={i} value={i}>{i}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Period */}
                      {rule.type !== "price_level" && rule.type !== "time_window" && (
                        <div>
                          <label className="mb-1 block text-xs text-dark-500">Period</label>
                          <input
                            type="number"
                            value={rule.period}
                            onChange={(e) => updateRule(rule.id, { period: parseInt(e.target.value) })}
                            min={2}
                            max={200}
                            className="w-full rounded-lg border border-dark-700 bg-t0-void px-3 py-2 text-sm text-dark-200 font-mono focus:border-primary-500 focus:outline-none"
                          />
                        </div>
                      )}

                      {/* Threshold / Value */}
                      <div>
                        <label className="mb-1 block text-xs text-dark-500">
                          {rule.type === "price_level" ? "Price ($)" : "Threshold"}
                        </label>
                        <input
                          type="number"
                          value={rule.threshold}
                          onChange={(e) => updateRule(rule.id, { threshold: parseFloat(e.target.value) })}
                          className="w-full rounded-lg border border-dark-700 bg-t0-void px-3 py-2 text-sm text-dark-200 font-mono focus:border-primary-500 focus:outline-none"
                        />
                      </div>

                      {/* Direction */}
                      <div>
                        <label className="mb-1 block text-xs text-dark-500">Direction</label>
                        <select
                          value={rule.direction}
                          onChange={(e) => updateRule(rule.id, { direction: e.target.value as Direction })}
                          className="w-full rounded-lg border border-dark-700 bg-t0-void px-3 py-2 text-sm text-dark-200 focus:border-primary-500 focus:outline-none"
                        >
                          <option value="below">Below</option>
                          <option value="above">Above</option>
                          <option value="cross_up">Cross Up</option>
                          <option value="cross_down">Cross Down</option>
                        </select>
                      </div>

                      {/* Symbol */}
                      <div>
                        <label className="mb-1 block text-xs text-dark-500">Symbol</label>
                        <select
                          value={rule.symbol}
                          onChange={(e) => updateRule(rule.id, { symbol: e.target.value })}
                          className="w-full rounded-lg border border-dark-700 bg-t0-void px-3 py-2 text-sm text-dark-200 focus:border-primary-500 focus:outline-none"
                        >
                          {SYMBOLS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {/* Action */}
                      <div>
                        <label className="mb-1 block text-xs text-dark-500">Action</label>
                        <select
                          value={rule.action}
                          onChange={(e) => updateRule(rule.id, { action: e.target.value as Action })}
                          className="w-full rounded-lg border border-dark-700 bg-t0-void px-3 py-2 text-sm text-dark-200 focus:border-primary-500 focus:outline-none"
                        >
                          <option value="buy">Buy Long</option>
                          <option value="sell">Sell Short</option>
                          <option value="close">Close Position</option>
                        </select>
                      </div>

                      {/* Size */}
                      <div>
                        <label className="mb-1 block text-xs text-dark-500">
                          Position Size (% of portfolio)
                        </label>
                        <input
                          type="number"
                          value={rule.size_pct}
                          onChange={(e) => updateRule(rule.id, { size_pct: parseFloat(e.target.value) })}
                          min={1}
                          max={100}
                          className="w-full rounded-lg border border-dark-700 bg-t0-void px-3 py-2 text-sm text-dark-200 font-mono focus:border-primary-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-4">
              <button
                onClick={saveStrategy}
                disabled={isLoading || !stratName.trim()}
                className="rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                {isLoading ? "Saving..." : "Save Strategy"}
              </button>
              {saveMsg && (
                <p className={`text-sm ${saveMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>
                  {saveMsg}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Community Tab */}
        {activeTab === "public" && (
          <div>
            {publicStrategies.length === 0 ? (
              <div className="rounded-2xl border border-dark-700/40 bg-dark-900 p-12 text-center">
                <p className="text-dark-400">No public strategies yet.</p>
                <p className="mt-2 text-xs text-dark-500">
                  Be the first to share your strategy with the community!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {publicStrategies.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-dark-700/40 bg-dark-900 p-5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-dark-100">{s.name}</h3>
                        {s.description && (
                          <p className="mt-1 text-sm text-dark-400">{s.description}</p>
                        )}
                        <p className="mt-1.5 text-xs text-dark-500">
                          by @{s.author ?? "anonymous"} · {s.rules.length} rules
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
