"use client";

import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/runtimeConfig";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoinPrice {
  price: number;
  change_24h?: number;
  change_pct_24h?: number;
}

interface DelayedPricesResponse {
  prices: Record<string, CoinPrice>;
}

// ─── Display order ────────────────────────────────────────────────────────────

const COIN_ORDER = [
  "BTC-USDT",
  "ETH-USDT",
  "SOL-USDT",
  "BNB-USDT",
  "XRP-USDT",
  "DOGE-USDT",
];

const DISPLAY_LABELS: Record<string, string> = {
  "BTC-USDT":  "BTC/USDT",
  "ETH-USDT":  "ETH/USDT",
  "SOL-USDT":  "SOL/USDT",
  "BNB-USDT":  "BNB/USDT",
  "XRP-USDT":  "XRP/USDT",
  "DOGE-USDT": "DOGE/USDT",
};

// ─── Fallback / loading data ──────────────────────────────────────────────────

const PLACEHOLDER_DATA: Record<string, CoinPrice> = {
  "BTC-USDT":  { price: 67420,   change_pct_24h:  1.24 },
  "ETH-USDT":  { price: 3482,    change_pct_24h: -0.82 },
  "SOL-USDT":  { price: 142.5,   change_pct_24h:  2.11 },
  "BNB-USDT":  { price: 598,     change_pct_24h: -0.34 },
  "XRP-USDT":  { price: 0.621,   change_pct_24h:  0.91 },
  "DOGE-USDT": { price: 0.1632,  change_pct_24h: -1.47 },
};

// ─── Number formatters ────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price >= 10000) {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (price >= 1) {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });
}

// ─── Single ticker item ───────────────────────────────────────────────────────

interface TickerItemProps {
  symbol: string;
  price: number;
  changePct: number;
}

function TickerItem({ symbol, price, changePct }: TickerItemProps) {
  const isUp = changePct >= 0;
  const arrow = isUp ? "▲" : "▼";
  const changeColor = isUp ? "#11d473" : "#f43f5e";
  const changeBg = isUp ? "rgba(17,212,115,0.10)" : "rgba(244,63,94,0.10)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        margin: "0 24px",
      }}
    >
      {/* Symbol */}
      <span
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "#ffffff",
          letterSpacing: "0.01em",
        }}
      >
        {DISPLAY_LABELS[symbol] ?? symbol}
      </span>

      {/* Price */}
      <span
        style={{
          fontFamily: "'JetBrains Mono', 'Fira Mono', 'Courier New', monospace",
          fontSize: "13px",
          fontWeight: 500,
          color: "#e2e8f0",
          letterSpacing: "0.02em",
        }}
      >
        ${formatPrice(price)}
      </span>

      {/* Change badge */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "2px",
          fontSize: "11px",
          fontWeight: 600,
          color: changeColor,
          background: changeBg,
          borderRadius: "4px",
          padding: "2px 6px",
          letterSpacing: "0.01em",
          whiteSpace: "nowrap",
        }}
      >
        {arrow} {Math.abs(changePct).toFixed(2)}%
      </span>
    </span>
  );
}

// ─── Separator dot ────────────────────────────────────────────────────────────

function Dot() {
  return (
    <span
      style={{
        color: "#475569",
        fontSize: "12px",
        userSelect: "none",
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      •
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TickerStrip() {
  const { data } = useQuery<DelayedPricesResponse>({
    queryKey: ["delayed-prices-ticker"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/market/delayed-prices`);
      if (!res.ok) throw new Error("Failed to fetch prices");
      return res.json();
    },
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 2,
  });

  // Use live data when available, fall back to placeholders
  const prices: Record<string, CoinPrice> =
    data?.prices && Object.keys(data.prices).length > 0
      ? data.prices
      : PLACEHOLDER_DATA;

  // Build the ordered coin list (filter out symbols we don't recognise)
  const items = COIN_ORDER.map((sym) => {
    const p = prices[sym] ?? PLACEHOLDER_DATA[sym];
    return {
      symbol: sym,
      price: p.price,
      changePct: p.change_pct_24h ?? 0,
    };
  });

  // Duplicate for seamless loop
  const doubledItems = [...items, ...items];

  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .ticker-track {
          animation: ticker-scroll 50s linear infinite;
          white-space: nowrap;
          will-change: transform;
        }

        .ticker-track:hover {
          animation-play-state: paused;
        }

        @keyframes ticker-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>

      <div
        role="marquee"
        aria-label="Live cryptocurrency prices"
        style={{
          height: "36px",
          background: "#080c14",
          borderBottom: "1px solid rgba(148,163,184,0.06)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          userSelect: "none",
          position: "relative",
        }}
      >
        {/* LIVE badge — absolutely positioned so it doesn't scroll */}
        <div
          aria-label="Live prices"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "0 14px",
            background:
              "linear-gradient(90deg, #080c14 70%, rgba(8,12,20,0) 100%)",
            zIndex: 2,
            flexShrink: 0,
          }}
        >
          {/* Pulsing dot */}
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#11d473",
              display: "inline-block",
              animation: "ticker-pulse 1.6s ease-in-out infinite",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "#11d473",
              background: "rgba(17,212,115,0.10)",
              padding: "2px 7px",
              borderRadius: "4px",
              lineHeight: 1.6,
              whiteSpace: "nowrap",
            }}
          >
            LIVE
          </span>
        </div>

        {/* Scrolling track */}
        <div
          className="ticker-track"
          style={{
            display: "inline-flex",
            alignItems: "center",
            paddingLeft: "90px", // offset so items don't hide under LIVE badge initially
          }}
        >
          {doubledItems.map((item, idx) => (
            <span
              key={`${item.symbol}-${idx}`}
              style={{ display: "inline-flex", alignItems: "center" }}
            >
              <TickerItem
                symbol={item.symbol}
                price={item.price}
                changePct={item.changePct}
              />
              {/* Separator dot between items (not after the last one of each set) */}
              {idx !== doubledItems.length - 1 && <Dot />}
            </span>
          ))}
        </div>

        {/* Right fade-out edge */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: "48px",
            background:
              "linear-gradient(270deg, #080c14 0%, rgba(8,12,20,0) 100%)",
            zIndex: 2,
            pointerEvents: "none",
          }}
        />
      </div>
    </>
  );
}
