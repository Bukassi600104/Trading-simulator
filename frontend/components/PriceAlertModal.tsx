"use client";

import { apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface PriceAlertModalProps {
  symbol: string;
  currentPrice: number;
  isOpen: boolean;
  onClose: () => void;
}

interface Alert {
  id: string;
  asset: string;
  threshold_price: number;
  direction: string;
  created_at: string;
}

export default function PriceAlertModal({
  symbol,
  currentPrice,
  isOpen,
  onClose,
}: PriceAlertModalProps) {
  const queryClient = useQueryClient();
  const [thresholdPrice, setThresholdPrice] = useState(
    currentPrice.toString()
  );
  const [direction, setDirection] = useState<"above" | "below">("above");

  const { data: alertsData } = useQuery<{ alerts: Alert[] }>({
    queryKey: ["price-alerts", symbol],
    queryFn: async () => {
      const res = await apiFetch("/api/alerts");
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return res.json();
    },
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/alerts", {
        method: "POST",
        body: JSON.stringify({
          asset: symbol,
          threshold_price: parseFloat(thresholdPrice),
          direction,
        }),
      });
      if (!res.ok) throw new Error("Failed to create alert");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-alerts"] });
      setThresholdPrice(currentPrice.toString());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const res = await apiFetch(`/api/alerts/${alertId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete alert");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-alerts"] });
    },
  });

  if (!isOpen) return null;

  const symbolAlerts = (alertsData?.alerts ?? []).filter(
    (a) => a.asset === symbol
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 rounded-xl bg-t0-surface border border-white/[0.06] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-base font-bold text-dark-50">
            Price Alerts - {symbol}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-dark-500 hover:text-dark-300 hover:bg-white/[0.05] transition-colors"
            aria-label="Close"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Create form */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-dark-500 mb-1.5">
              Alert when price goes
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setDirection("above")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  direction === "above"
                    ? "bg-profit-500/15 border border-profit-500/30 text-profit-400"
                    : "bg-t0-depth border border-white/[0.06] text-dark-500 hover:text-dark-300"
                }`}
              >
                Above
              </button>
              <button
                onClick={() => setDirection("below")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  direction === "below"
                    ? "bg-loss-500/15 border border-loss-500/30 text-loss-400"
                    : "bg-t0-depth border border-white/[0.06] text-dark-500 hover:text-dark-300"
                }`}
              >
                Below
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-dark-500 mb-1.5">
              Threshold Price (USD)
            </label>
            <input
              type="number"
              value={thresholdPrice}
              onChange={(e) => setThresholdPrice(e.target.value)}
              step="any"
              className="w-full h-11 px-3 rounded-lg bg-t0-depth border border-white/[0.06] text-dark-50 font-mono text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-colors"
            />
          </div>

          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !thresholdPrice}
            className="w-full py-3 rounded-lg text-sm font-bold bg-gradient-to-br from-primary-500 to-primary-600 text-t0-void hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {createMutation.isPending ? "Creating..." : "Create Alert"}
          </button>
        </div>

        {/* Existing alerts */}
        {symbolAlerts.length > 0 && (
          <div className="px-5 pb-4">
            <h4 className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-2">
              Active Alerts
            </h4>
            <div className="space-y-2">
              {symbolAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-t0-depth border border-white/[0.06]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        alert.direction === "above"
                          ? "bg-profit-500/10 text-profit-400"
                          : "bg-loss-500/10 text-loss-400"
                      }`}
                    >
                      {alert.direction.toUpperCase()}
                    </span>
                    <span className="font-mono text-sm text-dark-100">
                      ${alert.threshold_price.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(alert.id)}
                    disabled={deleteMutation.isPending}
                    className="w-6 h-6 flex items-center justify-center rounded text-dark-500 hover:text-loss-400 hover:bg-loss-500/10 transition-colors"
                    aria-label="Delete alert"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
