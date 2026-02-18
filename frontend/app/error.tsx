"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-t0-void px-4">
      <div className="w-full max-w-md rounded-2xl border border-dark-700/40 bg-dark-900 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-bold text-dark-100">
          Something went wrong
        </h2>
        <p className="mb-6 text-sm text-dark-400">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
