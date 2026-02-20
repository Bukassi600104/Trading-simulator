"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useAuthStore } from "@/stores/authStore";
import { API_BASE } from "@/lib/runtimeConfig";

interface Trader {
  user_id?: string;
  username?: string;
  email?: string;
  return_pct?: number;
  win_rate?: number;
  trade_count?: number;
  rank?: number;
}

interface Following {
  relationship_id: string;
  followed_id: string;
  email: string;
  copy_ratio: number;
  since: string;
}

interface Follower {
  follower_id: string;
  username: string;
  copy_ratio: number;
  since: string;
}

export default function CopyTradingPage() {
  const router = useRouter();
  const { token, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<"discover" | "following" | "followers">("discover");

  const [traders, setTraders] = useState<Trader[]>([]);
  const [following, setFollowing] = useState<Following[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const [copyRatio, setCopyRatio] = useState("1.0");

  useEffect(() => {
    const run = async () => {
      const ok = await checkAuth();
      if (!ok) {
        router.replace("/landing?auth=login");
        return;
      }
      setIsChecking(false);
      fetchAll();
    };
    run();
  }, [checkAuth, router]);

  async function fetchAll() {
    fetchTopTraders();
    fetchFollowing();
    fetchFollowers();
  }

  async function fetchTopTraders() {
    try {
      const res = await fetch(`${API_BASE}/api/copy/top-traders`);
      const data = await res.json();
      setTraders(data.traders || []);
    } catch {
      // Silently handle
    }
  }

  async function fetchFollowing() {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/copy/following`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setFollowing(data.following || []);
    } catch {
      // Silently handle
    }
  }

  async function fetchFollowers() {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/copy/followers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setFollowers(data.followers || []);
    } catch {
      // Silently handle
    }
  }

  async function handleFollow(userId: string) {
    if (!token) return;
    setFollowLoading(userId);
    try {
      const res = await fetch(`${API_BASE}/api/copy/follow/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ copy_ratio: parseFloat(copyRatio) }),
      });
      if (res.ok) fetchFollowing();
    } catch {
      // Silently handle
    } finally {
      setFollowLoading(null);
    }
  }

  async function handleUnfollow(userId: string) {
    if (!token) return;
    setFollowLoading(userId);
    try {
      await fetch(`${API_BASE}/api/copy/unfollow/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchFollowing();
    } catch {
      // Silently handle
    } finally {
      setFollowLoading(null);
    }
  }

  const isFollowing = (userId: string) =>
    following.some((f) => f.followed_id === userId);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-t0-void">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const tabs = [
    { id: "discover", label: "Top Traders" },
    { id: "following", label: `Following (${following.length})` },
    { id: "followers", label: `Followers (${followers.length})` },
  ] as const;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl p-6 md:p-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark-100">Copy Trading</h1>
            <p className="mt-1 text-sm text-dark-400">
              Mirror top traders' positions proportionally.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-dark-500">Copy ratio:</label>
            <select
              value={copyRatio}
              onChange={(e) => setCopyRatio(e.target.value)}
              className="rounded-lg border border-dark-700 bg-dark-900 px-2 py-1.5 text-sm text-dark-200 focus:outline-none"
            >
              <option value="0.25">0.25×</option>
              <option value="0.5">0.5×</option>
              <option value="1.0">1×</option>
              <option value="1.5">1.5×</option>
              <option value="2.0">2×</option>
            </select>
          </div>
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

        {/* Discover Tab */}
        {activeTab === "discover" && (
          <div className="rounded-2xl border border-dark-700/40 bg-dark-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-700/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-dark-500">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-dark-500">
                    Trader
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-dark-500">
                    Return
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-dark-500">
                    Win Rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-dark-500">
                    Trades
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-dark-500">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/20">
                {traders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-dark-500 text-sm">
                      No traders available yet. Start trading to appear here!
                    </td>
                  </tr>
                ) : (
                  traders.map((trader, idx) => {
                    const uid = trader.user_id || "";
                    const following_ = isFollowing(uid);
                    return (
                      <tr key={uid || idx} className="hover:bg-dark-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-dark-400">
                          #{trader.rank || idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-dark-200">
                            {trader.username || trader.email || `Trader #${idx + 1}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <span
                            className={
                              (trader.return_pct ?? 0) >= 0 ? "text-green-400" : "text-red-400"
                            }
                          >
                            {(trader.return_pct ?? 0) >= 0 ? "+" : ""}
                            {(trader.return_pct ?? 0).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-dark-200">
                          {(trader.win_rate ?? 0).toFixed(0)}%
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-dark-400">
                          {trader.trade_count ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {following_ ? (
                            <button
                              onClick={() => handleUnfollow(uid)}
                              disabled={followLoading === uid}
                              className="rounded-lg border border-dark-600 px-3 py-1.5 text-xs font-medium text-dark-400 hover:border-red-500/50 hover:text-red-400 disabled:opacity-50 transition-all"
                            >
                              {followLoading === uid ? "..." : "Unfollow"}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleFollow(uid)}
                              disabled={followLoading === uid || !uid}
                              className="rounded-lg bg-primary-500/10 border border-primary-500/30 px-3 py-1.5 text-xs font-medium text-primary-400 hover:bg-primary-500/20 disabled:opacity-50 transition-all"
                            >
                              {followLoading === uid ? "..." : "Copy"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Following Tab */}
        {activeTab === "following" && (
          <div>
            {following.length === 0 ? (
              <div className="rounded-2xl border border-dark-700/40 bg-dark-900 p-12 text-center">
                <p className="text-dark-400">You're not copying anyone yet.</p>
                <button
                  onClick={() => setActiveTab("discover")}
                  className="mt-4 rounded-lg bg-primary-500/10 px-4 py-2 text-sm font-medium text-primary-400 hover:bg-primary-500/20 transition-colors"
                >
                  Discover Top Traders →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {following.map((f) => (
                  <div
                    key={f.relationship_id}
                    className="flex items-center justify-between rounded-2xl border border-dark-700/40 bg-dark-900 p-4"
                  >
                    <div>
                      <p className="font-medium text-dark-200">@{f.email}</p>
                      <p className="text-xs text-dark-500">
                        Copying since {new Date(f.since).toLocaleDateString()} · {f.copy_ratio}× ratio
                      </p>
                    </div>
                    <button
                      onClick={() => handleUnfollow(f.followed_id)}
                      disabled={followLoading === f.followed_id}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                    >
                      {followLoading === f.followed_id ? "..." : "Unfollow"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Followers Tab */}
        {activeTab === "followers" && (
          <div>
            {followers.length === 0 ? (
              <div className="rounded-2xl border border-dark-700/40 bg-dark-900 p-12 text-center">
                <p className="text-dark-400">No one is copying your trades yet.</p>
                <p className="mt-2 text-xs text-dark-500">
                  Keep trading consistently to attract followers!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {followers.map((f) => (
                  <div
                    key={f.follower_id}
                    className="flex items-center justify-between rounded-2xl border border-dark-700/40 bg-dark-900 p-4"
                  >
                    <div>
                      <p className="font-medium text-dark-200">@{f.username}</p>
                      <p className="text-xs text-dark-500">
                        Following since {new Date(f.since).toLocaleDateString()} · {f.copy_ratio}× ratio
                      </p>
                    </div>
                    <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-400">
                      Active
                    </span>
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
