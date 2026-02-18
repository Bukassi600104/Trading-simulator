"use client";

import AppShell from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const SUPPORTED_SYMBOLS = ["BTC-USDT", "ETH-USDT", "SOL-USDT", "BNB-USDT", "XRP-USDT", "DOGE-USDT"];

const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "1D"] as const;

const LEVERAGE_MARKS = [2, 5, 10, 15, 20, 25] as const;

const ORDER_TYPES = ["Market", "Limit", "Stop"] as const;

interface PositionData {
  symbol: string;
  side: string;
  qty: string;
  entry_price: string;
  current_price: string;
  unrealized_pnl: string;
  roi_percent: string;
  liquidation_price: string | null;
  margin_used: string;
}

/* -------------------------------------------------------------------------- */
/*  Helper: normalise user-typed symbol to one we support                      */
/* -------------------------------------------------------------------------- */

function normalizeSymbol(value: string): string {
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return "BTC-USDT";
  if (SUPPORTED_SYMBOLS.includes(trimmed)) return trimmed;
  const dashed = trimmed.replace("/", "-");
  if (SUPPORTED_SYMBOLS.includes(dashed)) return dashed;
  // Try matching flat format (e.g. BTCUSDT -> BTC-USDT)
  const flat = trimmed.replace(/[-/\s]/g, "");
  const match = SUPPORTED_SYMBOLS.find((s) => s.replace("-", "") === flat);
  if (match) return match;
  return "BTC-USDT";
}

/* -------------------------------------------------------------------------- */
/*  Mock candlestick bars (visual placeholder)                                 */
/* -------------------------------------------------------------------------- */

function generateMockCandles(count: number) {
  const candles: { o: number; h: number; l: number; c: number }[] = [];
  let price = 67000;
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.48) * 800;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 400;
    const low = Math.min(open, close) - Math.random() * 400;
    candles.push({ o: open, h: high, l: low, c: close });
    price = close;
  }
  return candles;
}

/* -------------------------------------------------------------------------- */
/*  Attempt dynamic import of real chart / order panel                         */
/* -------------------------------------------------------------------------- */

let StreamingChart: React.ComponentType<{
  symbol?: string;
  onPriceUpdate?: (p: number) => void;
}> | null = null;

let OrderPanelReal: React.ComponentType<{
  symbol: string;
  currentPrice: number | null;
  onOrderSubmit?: (order: unknown) => void;
}> | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  StreamingChart = require("@/components/StreamingChart").default;
} catch {
  StreamingChart = null;
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  OrderPanelReal = require("@/components/OrderPanel").default;
} catch {
  OrderPanelReal = null;
}

/* ========================================================================== */
/*  TRADE PAGE (inner)                                                         */
/* ========================================================================== */

function TradePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const symbolParam = searchParams.get("symbol") || "BTC-USDT";
  const symbol = normalizeSymbol(symbolParam);
  const symbolIcon = symbol.startsWith("ETH") ? "\u039E" : "\u20BF";

  /* ---- local state ---- */
  const [symbolInput, setSymbolInput] = useState(symbol);
  const [currentPrice, setCurrentPrice] = useState<number | null>(67420.0);
  const [selectedTf, setSelectedTf] = useState<string>("15m");
  const [activeTab, setActiveTab] = useState<
    "positions" | "pending" | "history" | "journal"
  >("positions");
  const [isLoaded, setIsLoaded] = useState(false);
  const [mobileOrderOpen, setMobileOrderOpen] = useState(false);

  /* ---- order panel state (used only by fallback) ---- */
  const [orderType, setOrderType] = useState<string>("Market");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [qty, setQty] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [leverage, setLeverage] = useState(10);

  const { checkAuth } = useAuthStore();

  const mockCandles = useMemo(() => generateMockCandles(60), []);

  /* ---- auth guard ---- */
  useEffect(() => {
    const init = async () => {
      const ok = await checkAuth();
      if (!ok) {
        router.replace("/landing?auth=login");
        return;
      }
      setIsLoaded(true);
    };
    init();
  }, [checkAuth, router]);

  /* ---- portfolio data ---- */
  const { data: portfolioData } = useQuery<{
    balance: string;
    equity: string;
    positions: Record<string, PositionData>;
    open_position_count: number;
  }>({
    queryKey: ["portfolio"],
    queryFn: async () => {
      const res = await apiFetch("/api/trading/portfolio");
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      return res.json();
    },
    enabled: isLoaded,
    refetchInterval: 5_000,
  });

  const openPositions = useMemo(() => {
    if (!portfolioData?.positions) return [];
    return Object.values(portfolioData.positions).filter(
      (p) => parseFloat(p.qty) > 0
    );
  }, [portfolioData]);

  const balanceDisplay = portfolioData
    ? `$${parseFloat(portfolioData.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    : "$---";

  useEffect(() => {
    setSymbolInput(symbol);
  }, [symbol]);

  /* ---- loading screen ---- */
  if (!isLoaded) {
    return (
      <div className="loading-screen">
        <div className="t0-spinner" />
      </div>
    );
  }

  /* ---- derived ---- */
  const wsSymbol = symbol.replace("-", "");
  const priceChangePositive = true;
  const displayPrice = currentPrice
    ? currentPrice.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "---";

  const margin =
    currentPrice && qty
      ? ((parseFloat(qty) * currentPrice) / leverage).toFixed(2)
      : "0.00";
  const estValue =
    currentPrice && qty
      ? (parseFloat(qty) * currentPrice).toFixed(2)
      : "0.00";

  /* ---- candlestick SVG helpers ---- */
  const barWidth = 8;
  const gap = 3;
  const chartH = 320;
  const allPrices = mockCandles.flatMap((c) => [c.h, c.l]);
  const pMin = Math.min(...allPrices);
  const pMax = Math.max(...allPrices);
  const yScale = (p: number) =>
    chartH - ((p - pMin) / (pMax - pMin)) * (chartH - 20) - 10;

  return (
    <AppShell>
      {/* Full-bleed wrapper: no padding, fill the available height from AppShell */}
      <div className="flex flex-col h-full overflow-hidden bg-t0-void">
        {/* ================================================================ */}
        {/*  TOP BAR                                                         */}
        {/* ================================================================ */}
        <header className="flex items-center justify-between gap-4 px-4 py-2 border-b border-white/[0.06] bg-t0-depth shrink-0 flex-wrap">
          {/* Left: symbol selector + price */}
          <div className="flex items-center gap-4">
            {/* Symbol search */}
            <form
              className="flex items-center"
              onSubmit={(e) => {
                e.preventDefault();
                router.push(
                  `/trade?symbol=${encodeURIComponent(normalizeSymbol(symbolInput))}`
                );
              }}
            >
              <input
                className="w-36 h-9 px-3 rounded-md bg-t0-surface border border-white/[0.06] text-dark-50 text-sm font-semibold placeholder:text-dark-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-colors"
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value)}
                placeholder="Search symbol..."
                list="supported-symbols"
                aria-label="Symbol search"
              />
              <datalist id="supported-symbols">
                {SUPPORTED_SYMBOLS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </form>

            {/* Symbol badge + price */}
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-t0-surface border border-white/[0.06]">
              <span className="text-base text-primary-400">{symbolIcon}</span>
              <span className="text-[15px] font-bold text-dark-50 tracking-tight">
                {symbol}
              </span>
              <span className="font-mono text-lg font-bold text-dark-50">
                ${displayPrice}
              </span>
              {currentPrice && (
                <span
                  className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-md ${
                    priceChangePositive
                      ? "bg-primary-500/10 text-primary-400"
                      : "bg-loss-500/10 text-loss-400"
                  }`}
                >
                  {priceChangePositive ? "+2.45%" : "-2.45%"}
                </span>
              )}
            </div>
          </div>

          {/* Centre: timeframe tabs */}
          <div className="flex gap-0.5 p-1 rounded-lg bg-t0-surface">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTf(tf)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  selectedTf === tf
                    ? "bg-primary-500 text-t0-void"
                    : "text-dark-500 hover:text-dark-300"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Right: balance pill */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-t0-surface border border-white/[0.06]">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            <span className="font-mono text-sm font-bold text-dark-50">
              {balanceDisplay}
            </span>
            <span className="text-[10px] font-semibold text-dark-500 uppercase tracking-wider">
              Balance
            </span>
          </div>
        </header>

        {/* ================================================================ */}
        {/*  MAIN BODY: chart (left) + order panel (right)                   */}
        {/* ================================================================ */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ---- Chart column ---- */}
          <div className="flex flex-col flex-1 min-w-0">
            {/* Chart area */}
            <div className="relative flex-1 min-h-[360px] bg-t0-void bg-grid-dots bg-grid">
              {StreamingChart ? (
                <StreamingChart
                  symbol={wsSymbol}
                  onPriceUpdate={(p) => setCurrentPrice(p)}
                />
              ) : (
                /* Placeholder mock chart */
                <div className="absolute inset-0 flex items-end justify-center overflow-hidden">
                  <svg
                    viewBox={`0 0 ${mockCandles.length * (barWidth + gap)} ${chartH}`}
                    className="w-full h-full"
                    preserveAspectRatio="none"
                  >
                    {/* area fill under close */}
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(17,212,115,0.12)" />
                        <stop offset="100%" stopColor="rgba(17,212,115,0)" />
                      </linearGradient>
                    </defs>
                    <path
                      d={
                        `M0,${chartH} ` +
                        mockCandles
                          .map(
                            (c, i) =>
                              `L${i * (barWidth + gap) + barWidth / 2},${yScale(c.c)}`
                          )
                          .join(" ") +
                        ` L${(mockCandles.length - 1) * (barWidth + gap) + barWidth / 2},${chartH} Z`
                      }
                      fill="url(#chartGrad)"
                    />

                    {/* candle sticks */}
                    {mockCandles.map((c, i) => {
                      const x = i * (barWidth + gap);
                      const bullish = c.c >= c.o;
                      const color = bullish ? "#11d473" : "#f43f5e";
                      const bodyTop = yScale(Math.max(c.o, c.c));
                      const bodyBot = yScale(Math.min(c.o, c.c));
                      const bodyH = Math.max(bodyBot - bodyTop, 1);
                      return (
                        <g key={i}>
                          {/* wick */}
                          <line
                            x1={x + barWidth / 2}
                            y1={yScale(c.h)}
                            x2={x + barWidth / 2}
                            y2={yScale(c.l)}
                            stroke={color}
                            strokeWidth={1}
                            opacity={0.6}
                          />
                          {/* body */}
                          <rect
                            x={x}
                            y={bodyTop}
                            width={barWidth}
                            height={bodyH}
                            rx={1}
                            fill={color}
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* price line */}
                  <div className="absolute right-0 top-1/3 w-full border-t border-dashed border-primary-500/30" />
                  <div className="absolute right-2 top-[calc(33%-10px)] font-mono text-[10px] font-semibold text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded">
                    ${displayPrice}
                  </div>
                </div>
              )}

              {/* Replay controls (overlaid on chart) */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-full bg-t0-depth/90 border border-white/[0.06] backdrop-blur-xl">
                <button className="w-8 h-8 flex items-center justify-center rounded-full bg-t0-surface border border-white/[0.06] text-dark-500 hover:text-primary-400 hover:border-primary-500/40 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="19 20 9 12 19 4 19 20" />
                    <line x1="5" y1="19" x2="5" y2="5" />
                  </svg>
                </button>
                <button className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-t0-void shadow-glow-primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-full bg-t0-surface border border-white/[0.06] text-dark-500 hover:text-primary-400 hover:border-primary-500/40 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 4 15 12 5 20 5 4" />
                    <line x1="19" y1="5" x2="19" y2="19" />
                  </svg>
                </button>
                <div className="ml-1 pl-2 border-l border-white/[0.06]">
                  <span className="font-mono text-xs font-semibold text-dark-400">
                    1x
                  </span>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/*  BOTTOM PANEL - Positions / Orders / History                  */}
            {/* ============================================================ */}
            <section className="h-[260px] shrink-0 flex flex-col bg-t0-surface border-t border-white/[0.06]">
              {/* Tabs header */}
              <div className="flex items-center justify-between px-4 border-b border-white/[0.05]">
                <nav className="flex gap-1 py-2.5">
                  {(
                    [
                      { key: "positions", label: "Open Positions", count: openPositions.length },
                      { key: "pending", label: "Pending Orders" },
                      { key: "history", label: "Trade History" },
                      { key: "journal", label: "Journal" },
                    ] as { key: string; label: string; count?: number }[]
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as typeof activeTab)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all ${
                        activeTab === tab.key
                          ? "bg-t0-depth text-dark-50"
                          : "text-dark-500 hover:text-dark-300 hover:bg-white/[0.03]"
                      }`}
                    >
                      {tab.label}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-primary-500 text-t0-void text-[10px] font-bold leading-none">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>

                <div className="flex gap-2">
                  <button className="t0-btn t0-btn-ghost t0-btn-sm">
                    Edit TP/SL
                  </button>
                  <button className="px-3 py-1.5 rounded-md text-[12px] font-semibold bg-loss-500/10 border border-loss-500/20 text-loss-400 hover:bg-loss-500/20 transition-colors">
                    Close All
                  </button>
                </div>
              </div>

              {/* Tab body */}
              <div className="flex-1 overflow-auto">
                {activeTab === "positions" && <PositionsTable positions={openPositions} />}
                {activeTab === "pending" && (
                  <EmptyState text="No pending orders" />
                )}
                {activeTab === "history" && (
                  <EmptyState text="No trade history yet" />
                )}
                {activeTab === "journal" && (
                  <EmptyState text="Start journaling your trades" />
                )}
              </div>
            </section>
          </div>

          {/* ---- Order Panel column ---- */}
          <aside className="w-[340px] shrink-0 border-l border-white/[0.06] bg-t0-surface overflow-y-auto max-lg:hidden">
            {OrderPanelReal ? (
              <OrderPanelReal
                symbol={symbol}
                currentPrice={currentPrice}
              />
            ) : (
              /* Inline fallback order panel */
              <div className="p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-bold text-dark-50">
                    Place Order
                  </h3>
                  <span className="px-2.5 py-1 rounded-md bg-primary-500/10 text-primary-400 text-xs font-semibold">
                    {symbol}
                  </span>
                </div>

                {/* Order type tabs */}
                <div className="flex gap-1 p-1 bg-t0-depth rounded-lg mb-4">
                  {ORDER_TYPES.map((ot) => (
                    <button
                      key={ot}
                      onClick={() => setOrderType(ot)}
                      className={`flex-1 py-2 rounded-md text-[13px] font-medium transition-all ${
                        orderType === ot
                          ? "bg-t0-surface text-dark-50"
                          : "text-dark-500 hover:text-dark-300"
                      }`}
                    >
                      {ot}
                    </button>
                  ))}
                </div>

                {/* Buy/Sell toggle */}
                <div className="flex gap-2.5 mb-4">
                  <button
                    onClick={() => setSide("BUY")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-bold transition-all ${
                      side === "BUY"
                        ? "bg-gradient-to-br from-profit-500 to-profit-600 text-white shadow-glow-primary"
                        : "bg-t0-depth border border-white/[0.06] text-dark-500 hover:text-dark-300"
                    }`}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                    Long
                  </button>
                  <button
                    onClick={() => setSide("SELL")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-bold transition-all ${
                      side === "SELL"
                        ? "bg-gradient-to-br from-loss-500 to-loss-600 text-white shadow-glow-rose"
                        : "bg-t0-depth border border-white/[0.06] text-dark-500 hover:text-dark-300"
                    }`}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M12 5v14M5 12l7 7 7-7" />
                    </svg>
                    Short
                  </button>
                </div>

                {/* Limit price (shown only for Limit orders) */}
                {orderType === "Limit" && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-dark-500 mb-2">
                      Limit Price
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-11 px-3 pr-14 rounded-lg bg-t0-depth border border-white/[0.06] text-dark-50 font-mono text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-dark-600">
                        USDT
                      </span>
                    </div>
                  </div>
                )}

                {/* Size input */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-dark-500 mb-2">
                    Size
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      placeholder="0.00"
                      step="0.001"
                      min="0"
                      className="w-full h-11 px-3 pr-14 rounded-lg bg-t0-depth border border-white/[0.06] text-dark-50 font-mono text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-colors"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-dark-600">
                      {symbol.split("-")[0]}
                    </span>
                  </div>
                </div>

                {/* Leverage slider */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-dark-500">
                      Leverage
                    </label>
                    <span className="font-mono text-sm font-bold text-primary-400">
                      {leverage}x
                    </span>
                  </div>
                  {/* Slider track */}
                  <input
                    type="range"
                    min={2}
                    max={25}
                    value={leverage}
                    onChange={(e) => setLeverage(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none bg-t0-depth [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-glow-primary"
                  />
                  {/* Leverage marks */}
                  <div className="flex justify-between mt-2">
                    {LEVERAGE_MARKS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setLeverage(m)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                          leverage === m
                            ? "text-primary-400 bg-primary-500/10"
                            : "text-dark-600 hover:text-dark-400"
                        }`}
                      >
                        {m}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Margin info */}
                <div className="rounded-lg bg-t0-depth p-3 mb-4 space-y-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-dark-500">Est. Value</span>
                    <span className="font-mono text-dark-100">${estValue}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-dark-500">Margin</span>
                    <span className="font-mono text-dark-100">${margin}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-dark-500">Fees (est.)</span>
                    <span className="font-mono text-dark-400">~$0.00</span>
                  </div>
                </div>

                {/* Submit */}
                <button
                  className={`w-full py-4 rounded-xl text-[15px] font-bold transition-all ${
                    side === "BUY"
                      ? "t0-btn t0-btn-long"
                      : "t0-btn t0-btn-short"
                  }`}
                >
                  {side === "BUY" ? "Buy / Long" : "Sell / Short"}
                </button>
              </div>
            )}
          </aside>

          {/* Mobile order panel (bottom sheet) */}
          {mobileOrderOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setMobileOrderOpen(false)}
              />
              {/* Sheet */}
              <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-t0-surface border-t border-white/[0.06] animate-slide-up">
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-white/[0.15]" />
                </div>
                {OrderPanelReal ? (
                  <OrderPanelReal
                    symbol={symbol}
                    currentPrice={currentPrice}
                    onOrderSubmit={() => setMobileOrderOpen(false)}
                  />
                ) : (
                  <div className="p-5 text-center text-dark-500 text-sm">
                    Order panel unavailable
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile FAB to open order panel */}
          {!mobileOrderOpen && (
            <button
              onClick={() => setMobileOrderOpen(true)}
              className="fixed bottom-6 right-6 z-40 lg:hidden w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-t0-void shadow-glow-primary flex items-center justify-center"
              aria-label="Place Order"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}

/* ========================================================================== */
/*  POSITIONS TABLE                                                            */
/* ========================================================================== */

function PositionsTable({ positions }: { positions: PositionData[] }) {
  if (positions.length === 0) {
    return <EmptyState text="No open positions" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr>
            {["Market", "Side", "Size", "Entry", "Mark Price", "Liq. Price", "PnL (ROE)", ""].map(
              (h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-[11px] font-semibold text-dark-600 uppercase tracking-wider bg-t0-depth border-b border-white/[0.05]"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => {
            const pnl = parseFloat(pos.unrealized_pnl);
            const roi = parseFloat(pos.roi_percent);
            const isProfit = pnl >= 0;
            const symbolDisplay = pos.symbol.replace("-", "/");
            const sideLabel = pos.side === "BUY" ? "LONG" : "SHORT";
            const qtyNum = parseFloat(pos.qty);
            const baseAsset = pos.symbol.split("-")[0];

            return (
              <tr
                key={pos.symbol}
                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-3.5 font-mono text-sm font-semibold text-dark-100">
                  {symbolDisplay}
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`t0-badge text-[9px] ${
                      pos.side === "BUY" ? "t0-badge-profit" : "t0-badge-loss"
                    }`}
                  >
                    {sideLabel}
                  </span>
                </td>
                <td className="px-4 py-3.5 font-mono text-sm text-dark-400">
                  {qtyNum.toFixed(4)} {baseAsset}
                </td>
                <td className="px-4 py-3.5 font-mono text-sm text-dark-400">
                  {parseFloat(pos.entry_price).toLocaleString()}
                </td>
                <td className="px-4 py-3.5 font-mono text-sm text-dark-100">
                  {parseFloat(pos.current_price).toLocaleString()}
                </td>
                <td className="px-4 py-3.5 font-mono text-sm text-dark-500">
                  {pos.liquidation_price ? parseFloat(pos.liquidation_price).toLocaleString() : "-"}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-col">
                    <span
                      className={`font-mono text-sm font-semibold ${
                        isProfit ? "text-profit-400" : "text-loss-400"
                      }`}
                    >
                      {isProfit ? "+" : ""}${pnl.toFixed(2)}
                    </span>
                    <span
                      className={`font-mono text-[11px] ${
                        isProfit
                          ? "text-profit-400/60"
                          : "text-loss-400/60"
                      }`}
                    >
                      {isProfit ? "+" : ""}{roi.toFixed(2)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-md border border-white/[0.06] text-dark-500 hover:bg-loss-500/10 hover:border-loss-400/30 hover:text-loss-400 transition-colors"
                    title="Close Position"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ========================================================================== */
/*  EMPTY STATE                                                                */
/* ========================================================================== */

function EmptyState({ text }: { text: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 text-dark-600 text-sm">
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="opacity-40"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
      <span>{text}</span>
    </div>
  );
}

/* ========================================================================== */
/*  EXPORT                                                                     */
/* ========================================================================== */

export default function TradePage() {
  return (
    <Suspense
      fallback={
        <div className="loading-screen">
          <div className="t0-spinner" />
        </div>
      }
    >
      <TradePageInner />
    </Suspense>
  );
}
