"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-t0-void px-6 text-center">
      {/* Logo */}
      <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 font-mono text-2xl font-bold text-white">
        T0
      </div>

      <h1 className="mb-3 text-2xl font-bold text-dark-50">
        You are offline
      </h1>
      <p className="mb-8 max-w-sm text-sm text-dark-400 leading-relaxed">
        Terminal Zero needs an internet connection to stream live market data.
        Check your connection and try again.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-3 text-sm font-bold text-white transition-all hover:scale-[1.02] hover:shadow-lg"
      >
        Try Again
      </button>

      <p className="mt-12 text-xs text-dark-600">
        Terminal Zero — Ground Zero for Professional Trading
      </p>
    </div>
  );
}
