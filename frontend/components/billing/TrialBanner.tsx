"use client";

import { useAuthStore } from "@/stores/authStore";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const UpgradeModalLazy = dynamic(() => import("@/components/billing/UpgradeModal"), { ssr: false });

const DISMISS_KEY = "t0-trial-banner-dismissed";

export default function TrialBanner() {
  const { user } = useAuthStore();
  const [dismissed, setDismissed] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    // Check localStorage for dismissal
    try {
      const val = sessionStorage.getItem(DISMISS_KEY);
      if (!val) setDismissed(false);
    } catch {
      setDismissed(false);
    }

    // Check trial end date from user object
    const trialEnd = (user as unknown as Record<string, unknown>)?.trial_end_date;
    if (trialEnd && typeof trialEnd === "string") {
      const end = new Date(trialEnd);
      const now = new Date();
      const diff = Math.ceil(
        (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diff > 0 && diff <= 14) {
        setDaysLeft(diff);
      }
    }
  }, [user]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (dismissed || daysLeft === null) return null;

  return (
    <>
      <div className="relative rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-amber-400 shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="text-sm font-medium text-amber-200">
            Your Pro trial ends in{" "}
            <span className="font-bold text-amber-400">{daysLeft} day{daysLeft !== 1 ? "s" : ""}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUpgradeOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/30 transition-colors"
          >
            Upgrade Now
          </button>
          <button
            onClick={handleDismiss}
            className="w-6 h-6 flex items-center justify-center rounded text-dark-500 hover:text-dark-300 transition-colors"
            aria-label="Dismiss"
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
      </div>

      <UpgradeModalLazy
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
    </>
  );
}
