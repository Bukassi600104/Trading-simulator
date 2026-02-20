"use client";

import { apiFetch } from "@/lib/api";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

const PRO_FEATURES = [
  "Real-time market data",
  "Backtesting & Bar Replay",
  "AI-powered coaching",
  "Advanced analytics",
  "Multiple portfolios",
];

const ELITE_FEATURES = [
  "Everything in Pro",
  "DeFi simulation",
  "Copy trading",
  "Strategy builder",
  "Private leaderboards",
];

export default function UpgradeModal({
  isOpen,
  onClose,
  featureName,
}: UpgradeModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (plan: string) => {
    setLoading(plan);
    try {
      const res = await apiFetch("/api/billing/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({
          plan,
          success_url: window.location.href,
          cancel_url: window.location.href,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
          return;
        }
      }
      // Billing API unavailable — redirect to pricing
      router.push("/pricing");
      onClose();
    } catch {
      router.push("/pricing");
      onClose();
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
              >
                <div className="relative w-full max-w-[680px] bg-[#070714] border border-[#1a1a2e] rounded-2xl p-8 shadow-modal">
                  {/* Close button */}
                  <Dialog.Close asChild>
                    <button className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-dark-500 hover:text-dark-300 hover:bg-white/[0.05] transition-colors">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </Dialog.Close>

                  {/* Header */}
                  <div className="text-center mb-8">
                    <h2 className="text-xl font-bold text-dark-50 mb-2">
                      Unlock{" "}
                      {featureName
                        ? featureName.replace(/_/g, " ")
                        : "Premium Features"}
                    </h2>
                    <p className="text-sm text-dark-500">
                      Choose the plan that fits your trading goals
                    </p>
                  </div>

                  {/* Plans grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Pro Plan */}
                    <div className="relative bg-[#0d0d1a] border border-[#1a1a2e] rounded-xl p-6 flex flex-col">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                        Most Popular
                      </div>
                      <h3 className="text-lg font-bold text-dark-50 mt-2 mb-1">
                        Pro
                      </h3>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="font-mono text-3xl font-extrabold text-dark-50">
                          $9.99
                        </span>
                        <span className="text-dark-500 text-sm">/mo</span>
                      </div>
                      <p className="text-2xs text-dark-600 mb-1">
                        or $59.99/yr (save 20%)
                      </p>
                      <p className="text-2xs text-dark-600 mb-4">
                        NGN 5,400/mo
                      </p>

                      <ul className="flex-1 space-y-2 mb-6">
                        {PRO_FEATURES.map((f) => (
                          <li
                            key={f}
                            className="flex items-center gap-2 text-sm text-dark-300"
                          >
                            <svg
                              className="w-4 h-4 text-primary-500 shrink-0"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {f}
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => handleUpgrade("pro_monthly")}
                        disabled={loading !== null}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-t0-void font-bold text-sm hover:shadow-glow-primary transition-all disabled:opacity-50"
                      >
                        {loading === "pro_monthly"
                          ? "Redirecting..."
                          : "Upgrade to Pro"}
                      </button>
                    </div>

                    {/* Elite Plan */}
                    <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-xl p-6 flex flex-col">
                      <h3 className="text-lg font-bold text-dark-50 mt-2 mb-1">
                        Elite
                      </h3>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="font-mono text-3xl font-extrabold text-dark-50">
                          $24.99
                        </span>
                        <span className="text-dark-500 text-sm">/mo</span>
                      </div>
                      <p className="text-2xs text-dark-600 mb-1">
                        or $149.99/yr (save 20%)
                      </p>
                      <p className="text-2xs text-dark-600 mb-4">
                        NGN 13,500/mo
                      </p>

                      <ul className="flex-1 space-y-2 mb-6">
                        {ELITE_FEATURES.map((f) => (
                          <li
                            key={f}
                            className="flex items-center gap-2 text-sm text-dark-300"
                          >
                            <svg
                              className="w-4 h-4 text-lavender-400 shrink-0"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {f}
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => handleUpgrade("elite_monthly")}
                        disabled={loading !== null}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-lavender-600 to-lavender-500 text-dark-50 font-bold text-sm hover:shadow-glow-lavender transition-all disabled:opacity-50"
                      >
                        {loading === "elite_monthly"
                          ? "Redirecting..."
                          : "Upgrade to Elite"}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
