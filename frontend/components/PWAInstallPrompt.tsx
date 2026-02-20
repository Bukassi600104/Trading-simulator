"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Only show on mobile
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Track visit count
    const visitCount = parseInt(
      localStorage.getItem("pwa_visit_count") || "0",
      10
    );
    localStorage.setItem("pwa_visit_count", String(visitCount + 1));

    // Check if already dismissed
    const dismissed = localStorage.getItem("pwa_prompt_dismissed");
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show after 3rd visit
      const currentCount = parseInt(
        localStorage.getItem("pwa_visit_count") || "0",
        10
      );
      if (currentCount >= 3) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa_prompt_dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="mx-auto max-w-md rounded-2xl border border-dark-700/60 bg-dark-900 p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 font-mono text-sm font-bold text-white">
            T0
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-dark-100">
              Add Terminal Zero to your home screen
            </p>
            <p className="mt-0.5 text-xs text-dark-400">
              Get the best experience with quick access and offline support.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-600"
              >
                <Download className="h-3.5 w-3.5" />
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-lg px-3 py-2 text-xs font-medium text-dark-400 transition-colors hover:text-dark-200"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 text-dark-500 hover:text-dark-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
