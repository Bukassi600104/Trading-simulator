"use client";

import AuthModal from "@/components/AuthModal";
import { API_BASE } from "@/lib/runtimeConfig";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface PriceData {
  price: number;
  change_24h: number;
  high_24h?: number;
  low_24h?: number;
  volume_24h?: number;
}
interface DelayedPricesResponse {
  prices: Record<string, PriceData>;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const apiFetch = (path: string) => fetch(API_BASE + path);

const COINS = [
  { symbol: "BTC-USDT", name: "Bitcoin",  short: "BTC", color: "#F7931A" },
  { symbol: "ETH-USDT", name: "Ethereum", short: "ETH", color: "#627EEA" },
  { symbol: "SOL-USDT", name: "Solana",   short: "SOL", color: "#9945FF" },
  { symbol: "BNB-USDT", name: "BNB",      short: "BNB", color: "#F3BA2F" },
  { symbol: "XRP-USDT", name: "XRP",      short: "XRP", color: "#00AAE4" },
  { symbol: "DOGE-USDT","name": "Dogecoin", short: "DOGE", color: "#C2A633" },
];

const FALLBACK_PRICES: Record<string, PriceData> = {
  "BTC-USDT":  { price: 67420,  change_24h: 1.24,  high_24h: 68900,  low_24h: 65200,  volume_24h: 28_400_000_000 },
  "ETH-USDT":  { price: 1942,   change_24h: -0.82, high_24h: 1990,   low_24h: 1910,   volume_24h: 9_100_000_000 },
  "SOL-USDT":  { price: 83.22,  change_24h: 2.11,  high_24h: 86.40,  low_24h: 80.10,  volume_24h: 2_300_000_000 },
  "BNB-USDT":  { price: 612,    change_24h: -0.43, high_24h: 624,    low_24h: 605,    volume_24h: 1_500_000_000 },
  "XRP-USDT":  { price: 1.39,   change_24h: 3.21,  high_24h: 1.45,   low_24h: 1.32,   volume_24h: 3_800_000_000 },
  "DOGE-USDT": { price: 0.095,  change_24h: -1.15, high_24h: 0.099,  low_24h: 0.091,  volume_24h: 980_000_000  },
};

// Fake market-cap data for display
const MARKET_CAPS: Record<string, number> = {
  "BTC-USDT":  1_320_000_000_000,
  "ETH-USDT":  234_000_000_000,
  "SOL-USDT":  38_000_000_000,
  "BNB-USDT":  88_000_000_000,
  "XRP-USDT":  76_000_000_000,
  "DOGE-USDT": 13_700_000_000,
};

// Sparkline paths — each coin gets a realistic 7D SVG polyline
const SPARKLINES: Record<string, number[]> = {
  "BTC-USDT":  [82,74,79,71,76,88,81,85,78,84,90,86,91,95,89,93,97,92,96,100],
  "ETH-USDT":  [90,88,84,79,76,72,75,71,68,70,65,68,62,60,58,61,57,55,53,50],
  "SOL-USDT":  [60,64,58,67,72,69,75,80,77,83,79,85,82,88,91,87,93,90,95,100],
  "BNB-USDT":  [70,74,71,68,65,69,72,66,63,67,61,58,62,59,56,60,57,54,51,48],
  "XRP-USDT":  [50,55,52,60,65,58,68,72,66,73,70,78,82,75,83,88,84,91,96,100],
  "DOGE-USDT": [80,76,72,68,74,70,66,62,66,62,58,54,57,52,48,52,48,44,48,44],
};

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmt(n: number, digits = 2): string {
  if (n >= 1000) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1)    return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: 4 });
  return n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}
function fmtCompact(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

// ─── Root export (Suspense boundary for useSearchParams) ─────────────────────
export default function LandingPage() {
  return (
    <Suspense
      fallback={
        <div className="loading-screen">
          <div className="t0-spinner" />
        </div>
      }
    >
      <LandingPageInner />
    </Suspense>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function LandingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<"login" | "register">("register");
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (mounted && isAuthenticated) router.push("/dashboard");
  }, [mounted, isAuthenticated, router]);

  // Open modal if ?auth= param present
  useEffect(() => {
    if (!mounted || isAuthenticated) return;
    const auth = searchParams.get("auth");
    if (auth === "login" || auth === "register") {
      setAuthInitialTab(auth);
      setAuthModalOpen(true);
    }
  }, [mounted, isAuthenticated, searchParams]);

  // Live prices from API
  const { data: priceData } = useQuery<DelayedPricesResponse>({
    queryKey: ["landing-prices"],
    queryFn: () => apiFetch("/api/market/delayed-prices").then((r) => r.json()),
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  const prices = priceData?.prices ?? FALLBACK_PRICES;

  const openRegister = () => {
    setAuthInitialTab("register");
    setAuthModalOpen(true);
  };
  const openLogin = () => {
    setAuthInitialTab("login");
    setAuthModalOpen(true);
  };

  return (
    <div className="relative min-h-screen bg-t0-void overflow-x-hidden">
      {/* ── Ambient background ─────────────────────────────────────────── */}
      <div className="t0-ambient" />
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(17,212,115,0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Deep green radial glow at top */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(17,212,115,0.07) 0%, transparent 65%)",
        }}
      />

      {/* ══════════════════════════════════════════════════════════════════
          1. TICKER STRIP
      ══════════════════════════════════════════════════════════════════ */}
      <TickerStrip prices={prices} />

      {/* ══════════════════════════════════════════════════════════════════
          2. NAVIGATION
      ══════════════════════════════════════════════════════════════════ */}
      <nav
        className={`fixed top-[40px] left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "glass-header shadow-[0_1px_0_rgba(17,212,115,0.08)]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 lg:px-10 h-16">
          {/* Logo */}
          <a href="/landing" className="flex items-center gap-3 group shrink-0">
            <div className="relative w-9 h-9 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-9 h-9">
                <polygon
                  points="18,2 33,10.5 33,25.5 18,34 3,25.5 3,10.5"
                  fill="none"
                  stroke="#11d473"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <polygon
                  points="18,8 27,13 27,23 18,28 9,23 9,13"
                  fill="rgba(17,212,115,0.12)"
                  stroke="rgba(17,212,115,0.4)"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
                <text
                  x="18"
                  y="22"
                  textAnchor="middle"
                  fill="#11d473"
                  fontSize="11"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="700"
                >
                  T0
                </text>
              </svg>
            </div>
            <span className="text-sm font-bold tracking-[0.2em] text-dark-50 uppercase group-hover:text-primary-400 transition-colors">
              Terminal Zero
            </span>
          </a>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: "Markets", href: "#markets" },
              { label: "Trade", href: "/trade" },
              { label: "Learn", href: "/learn/crypto-trading-basics" },
              { label: "Leaderboard", href: "/community" },
              { label: "Pricing", href: "/pricing" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-dark-400 hover:text-dark-50 transition-colors relative group"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-primary-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </a>
            ))}
          </div>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            {mounted && isAuthenticated ? (
              <button
                onClick={() => router.push("/dashboard")}
                className="t0-btn t0-btn-primary"
              >
                Dashboard
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 10.5L9 7L5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : (
              <>
                <button
                  onClick={openLogin}
                  className="t0-btn t0-btn-ghost text-sm"
                >
                  Log In
                </button>
                <button
                  onClick={openRegister}
                  className="t0-btn t0-btn-primary text-sm"
                >
                  Start Free
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span
              className={`block w-5 h-0.5 bg-dark-300 transition-all ${mobileMenuOpen ? "rotate-45 translate-y-2" : ""}`}
            />
            <span
              className={`block w-5 h-0.5 bg-dark-300 transition-all ${mobileMenuOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`block w-5 h-0.5 bg-dark-300 transition-all ${mobileMenuOpen ? "-rotate-45 -translate-y-2" : ""}`}
            />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-panel m-3 mt-0 rounded-lg border border-white/[0.06] p-4 flex flex-col gap-3">
            {[
              { label: "Markets", href: "#markets" },
              { label: "Trade", href: "/trade" },
              { label: "Pricing", href: "/pricing" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm text-dark-300 py-1 hover:text-primary-400 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2 border-t border-white/[0.05]">
              <button onClick={openLogin} className="t0-btn t0-btn-ghost flex-1 text-sm">Log In</button>
              <button onClick={openRegister} className="t0-btn t0-btn-primary flex-1 text-sm">Start Free</button>
            </div>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          3. HERO SECTION
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-10 pt-[120px] pb-20 min-h-screen grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Left column */}
        <div className="max-w-[600px] animate-slide-up">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-primary-500/25 bg-primary-500/8 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
            </span>
            <span className="text-[11px] font-bold text-primary-400 tracking-widest uppercase">
              Live Bybit Prices
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-extrabold leading-[1.04] tracking-[-2.5px] mb-7">
            <span
              className="block text-[52px] lg:text-[68px] text-dark-50"
              style={{ fontFeatureSettings: "'ss01'" }}
            >
              Trade Crypto.
            </span>
            <span className="block text-[52px] lg:text-[68px] text-gradient">
              Master the Markets.
            </span>
            <span className="block text-[52px] lg:text-[68px] text-dark-50">
              Risk-Free.
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-lg lg:text-xl leading-relaxed text-dark-400 mb-10 max-w-[480px]">
            Paper trade with real Bybit prices. Build your strategy, test your
            edge — before a single dollar goes on the line.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-12">
            <button
              onClick={openRegister}
              className="t0-btn t0-btn-primary t0-btn-lg group text-base"
            >
              Start Trading Free
              <svg
                className="transition-transform group-hover:translate-x-1"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M4.167 10h11.666M10 4.167L15.833 10 10 15.833"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <a
              href="#markets"
              className="t0-btn t0-btn-ghost border border-white/[0.08] hover:border-primary-500/30 text-dark-300 hover:text-dark-50 text-base"
            >
              View Live Markets
            </a>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { value: "50,000+", label: "Active Traders" },
              { value: "$2.4B+",  label: "Volume Simulated" },
              { value: "Real-Time", label: "Bybit Data" },
              { value: "6",       label: "Trading Pairs" },
            ].map((s, i) => (
              <div key={i} className="flex flex-col gap-1">
                <span className="font-mono text-xl font-bold text-primary-400 tabular-nums">
                  {s.value}
                </span>
                <span className="text-xs text-dark-500">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — live exchange widget */}
        <div className="relative animate-slide-up delay-200">
          {/* Glow behind card */}
          <div
            className="absolute -inset-12 -z-10 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 50%, rgba(17,212,115,0.08) 0%, transparent 70%)",
              filter: "blur(20px)",
            }}
          />
          <ExchangeWidget prices={prices} mounted={mounted} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          4. LIVE MARKETS TABLE
      ══════════════════════════════════════════════════════════════════ */}
      <section id="markets" className="relative z-10 py-24">
        <div className="max-w-[1300px] mx-auto px-6 lg:px-10">
          {/* Section header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-dark-50">Live Markets</h2>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-500/10 border border-primary-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                <span className="text-[10px] font-bold text-primary-400 uppercase tracking-wider">
                  Updated live
                </span>
              </div>
            </div>
            <a
              href="/trade"
              className="text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1.5"
            >
              View All Markets
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 10.5L9 7L5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>

          {/* Table */}
          <MarketsTable prices={prices} mounted={mounted} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          5. FEATURE CARDS
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-24 bg-gradient-to-b from-transparent via-t0-depth/30 to-transparent">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary-500/10 text-[11px] font-bold text-primary-400 uppercase tracking-widest mb-5 border border-primary-500/15">
              Platform Features
            </span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-dark-50 tracking-tight mb-4">
              Engineered for Serious Traders
            </h2>
            <p className="text-lg text-dark-400 leading-relaxed">
              Professional-grade tools without the professional-grade risk.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: <IconSatellite />,
                label: "Real Bybit Prices",
                accent: "#11d473",
                desc: "Tick-by-tick market data streamed directly from Bybit exchange. Sub-second price updates across 6 perpetual pairs.",
              },
              {
                icon: <IconShield />,
                label: "Zero Risk Trading",
                accent: "#11d473",
                desc: "Trade with $10,000 in virtual capital. Every order, every loss — completely simulated. No real money, ever.",
              },
              {
                icon: <IconBrain />,
                label: "AI Coaching",
                accent: "#11d473",
                desc: "Claude AI analyzes every trade you make: your entry timing, risk/reward, psychology patterns. Level up with context.",
              },
              {
                icon: <IconChart />,
                label: "Strategy Backtesting",
                accent: "#8b5cf6",
                desc: "Test your strategies against months of historical OHLCV data. Quantify your edge before going live.",
              },
              {
                icon: <IconTarget />,
                label: "Prop Firm Challenges",
                accent: "#FFD93D",
                desc: "FTMO-style evaluation rules: drawdown limits, profit targets, consistency requirements. Prep for the real thing.",
              },
              {
                icon: <IconTrophy />,
                label: "Clan Leaderboards",
                accent: "#ff6b6b",
                desc: "Form clans, compete on PnL, XP, and win rate. Community trading tournaments with real-time rankings.",
              },
            ].map((f, i) => (
              <FeatureCard key={i} {...f} delay={i * 80} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          6. TRUST / SOCIAL PROOF BAR
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-16 border-y border-white/[0.05]">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {[
              { value: "50,000+",  label: "Active Traders",    sub: "and growing daily" },
              { value: "$2.4B+",   label: "Volume Simulated",  sub: "across all pairs" },
              { value: "99.9%",    label: "Platform Uptime",   sub: "SLA guaranteed" },
              { value: "<50ms",    label: "Price Latency",     sub: "from Bybit WS" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="font-mono text-3xl lg:text-4xl font-extrabold text-primary-400 mb-1 tabular-nums">
                  {s.value}
                </div>
                <div className="text-sm font-semibold text-dark-200 mb-0.5">{s.label}</div>
                <div className="text-xs text-dark-500">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Powered by row */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-dark-500 uppercase tracking-widest font-semibold">
              Powered by
            </p>
            <div className="flex items-center gap-8 flex-wrap justify-center">
              {[
                { name: "Bybit",    label: "Market Data",     color: "#F7A600" },
                { name: "Railway",  label: "Infrastructure",  color: "#7B61FF" },
                { name: "Supabase", label: "Auth & Database", color: "#3ECF8E" },
                { name: "Claude AI","label": "AI Coaching",   color: "#D97706" },
              ].map((p, i) => (
                <div key={i} className="flex items-center gap-2.5 opacity-60 hover:opacity-100 transition-opacity">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-sm font-bold text-dark-200">{p.name}</span>
                  <span className="text-xs text-dark-500">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          7. PRICING TEASER
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-24">
        <div className="max-w-[900px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary-500/10 text-[11px] font-bold text-primary-400 uppercase tracking-widest mb-5 border border-primary-500/15">
              Simple Pricing
            </span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-dark-50 tracking-tight">
              Start Free. Go Pro When Ready.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="t0-card p-8 hover:border-white/[0.12]">
              <div className="mb-6">
                <div className="text-xs font-bold text-dark-500 uppercase tracking-widest mb-3">Free</div>
                <div className="flex items-end gap-1 mb-2">
                  <span className="font-mono text-5xl font-extrabold text-dark-50">$0</span>
                  <span className="text-dark-500 mb-1.5">/month</span>
                </div>
                <p className="text-sm text-dark-400">Everything you need to start paper trading.</p>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Paper trading with $10K virtual balance",
                  "Delayed price data (15 min)",
                  "1 active portfolio",
                  "Trade journal",
                  "Basic analytics",
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-dark-300">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7L5.5 10L11.5 4" stroke="#11d473" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={openRegister}
                className="t0-btn t0-btn-secondary w-full justify-center"
              >
                Get Started Free
              </button>
            </div>

            {/* Pro */}
            <div className="relative t0-card p-8 border-primary-500/30 bg-gradient-to-br from-primary-500/[0.04] to-transparent">
              {/* Popular badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="t0-badge t0-badge-primary text-[10px] shadow-glow-primary">
                  Most Popular
                </span>
              </div>
              {/* Top glow line */}
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{
                  background: "linear-gradient(90deg, transparent, #11d473, transparent)",
                }}
              />
              <div className="mb-6">
                <div className="text-xs font-bold text-primary-400 uppercase tracking-widest mb-3">Pro</div>
                <div className="flex items-end gap-1 mb-2">
                  <span className="font-mono text-5xl font-extrabold text-dark-50">$9</span>
                  <span className="font-mono text-2xl font-bold text-dark-200 mb-1">.99</span>
                  <span className="text-dark-500 mb-1.5">/month</span>
                </div>
                <p className="text-sm text-dark-400">Institutional-grade tools for serious traders.</p>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Everything in Free",
                  "Real-time Bybit price feeds",
                  "Claude AI coaching on every trade",
                  "Strategy backtesting lab",
                  "Unlimited portfolios",
                  "Prop firm challenge mode",
                  "Priority support",
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-dark-200">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7L5.5 10L11.5 4" stroke="#11d473" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={openRegister}
                className="t0-btn t0-btn-primary w-full justify-center"
              >
                Start Pro Trial
              </button>
            </div>
          </div>

          <p className="text-center mt-6 text-sm text-dark-500">
            Need more?{" "}
            <a href="/pricing" className="text-primary-400 hover:text-primary-300 transition-colors">
              View full pricing including Prop Challenge plans →
            </a>
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-24 px-6 lg:px-10">
        <div className="max-w-[800px] mx-auto">
          <div
            className="relative rounded-2xl p-12 lg:p-20 text-center overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(17,212,115,0.06) 0%, rgba(15,23,42,0.8) 50%, rgba(139,92,246,0.04) 100%)",
              border: "1px solid rgba(17,212,115,0.15)",
            }}
          >
            {/* Corner glow */}
            <div
              className="absolute top-0 left-0 w-64 h-64 pointer-events-none"
              style={{
                background: "radial-gradient(circle at 0% 0%, rgba(17,212,115,0.08) 0%, transparent 70%)",
              }}
            />
            <div
              className="absolute bottom-0 right-0 w-64 h-64 pointer-events-none"
              style={{
                background: "radial-gradient(circle at 100% 100%, rgba(139,92,246,0.06) 0%, transparent 70%)",
              }}
            />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary-500/20 bg-primary-500/8 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                <span className="text-[11px] font-bold text-primary-400 tracking-widest uppercase">
                  No credit card required
                </span>
              </div>
              <h2 className="text-3xl lg:text-5xl font-extrabold text-dark-50 tracking-tight mb-4">
                Ready to Trade Like a Pro?
              </h2>
              <p className="text-lg text-dark-400 mb-10 max-w-md mx-auto">
                Join 50,000+ traders practicing risk-free with real market data every day.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={openRegister}
                  className="t0-btn t0-btn-primary t0-btn-lg group"
                >
                  Create Free Account
                  <svg
                    className="transition-transform group-hover:translate-x-1"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d="M4.167 10h11.666M10 4.167L15.833 10 10 15.833"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  onClick={openLogin}
                  className="t0-btn t0-btn-ghost border border-white/[0.08] hover:border-white/20 text-dark-300"
                >
                  Already have an account? Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          8. FOOTER
      ══════════════════════════════════════════════════════════════════ */}
      <footer className="relative z-10 border-t border-white/[0.05] py-12 px-6 lg:px-10">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <svg viewBox="0 0 36 36" className="w-8 h-8">
                  <polygon
                    points="18,2 33,10.5 33,25.5 18,34 3,25.5 3,10.5"
                    fill="none"
                    stroke="#11d473"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm font-bold tracking-[0.18em] text-dark-100 uppercase">
                  Terminal Zero
                </span>
              </div>
              <p className="text-sm text-dark-500 leading-relaxed max-w-[320px] mb-5">
                The professional crypto paper trading simulator. Build your edge before your first real trade.
              </p>
              {/* Social links */}
              <div className="flex items-center gap-4">
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg border border-white/[0.06] flex items-center justify-center text-dark-500 hover:text-dark-100 hover:border-white/20 transition-all"
                  aria-label="Twitter / X"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg border border-white/[0.06] flex items-center justify-center text-dark-500 hover:text-dark-100 hover:border-white/20 transition-all"
                  aria-label="GitHub"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Links */}
            <div>
              <p className="text-xs font-bold text-dark-500 uppercase tracking-wider mb-4">Platform</p>
              <ul className="space-y-2.5">
                {[
                  { label: "Markets",    href: "#markets" },
                  { label: "Trade",      href: "/trade" },
                  { label: "Leaderboard", href: "/community" },
                  { label: "Pricing",    href: "/pricing" },
                  { label: "Backtesting", href: "/backtesting" },
                ].map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-dark-500 hover:text-dark-200 transition-colors">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold text-dark-500 uppercase tracking-wider mb-4">Legal</p>
              <ul className="space-y-2.5">
                {[
                  { label: "Privacy Policy", href: "/legal/privacy" },
                  { label: "Terms of Service", href: "/legal/terms" },
                  { label: "Disclaimer",      href: "/legal/disclaimer" },
                ].map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-dark-500 hover:text-dark-200 transition-colors">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/[0.05] pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <p className="text-xs text-dark-600">
              &copy; {new Date().getFullYear()} Terminal Zero. All rights reserved.
            </p>
            <p className="text-xs text-dark-600 max-w-lg">
              Terminal Zero is a paper trading simulator for educational purposes only. No real money or cryptocurrency is involved in any transaction. Market prices are sourced from Bybit and may be delayed. This is not financial advice.
            </p>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authInitialTab}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICKER STRIP COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function TickerStrip({ prices }: { prices: Record<string, PriceData> }) {
  const items = COINS.map((c) => {
    const p = prices[c.symbol] ?? FALLBACK_PRICES[c.symbol];
    return { ...c, price: p.price, change: p.change_24h };
  });

  // Duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] overflow-hidden"
      style={{
        height: "40px",
        background: "#030b1a",
        borderBottom: "1px solid rgba(17,212,115,0.08)",
      }}
    >
      <div className="flex items-center h-full animate-ticker" style={{ width: "max-content" }}>
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-3 px-4">
            <span className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-dark-300 tracking-wider">
                {item.short}/USDT
              </span>
              <span
                className="font-mono text-[11px] font-semibold text-dark-100"
                style={{ fontFeatureSettings: "'tnum'" }}
              >
                ${fmt(item.price)}
              </span>
              <span
                className={`font-mono text-[10px] font-bold ${
                  item.change >= 0 ? "text-profit-400" : "text-loss-400"
                }`}
              >
                {item.change >= 0 ? "▲" : "▼"}
                {Math.abs(item.change).toFixed(2)}%
              </span>
            </span>
            <span className="w-px h-3 bg-white/[0.08]" />
          </span>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXCHANGE WIDGET COMPONENT (hero right column)
// ═══════════════════════════════════════════════════════════════════════════════
function ExchangeWidget({
  prices,
  mounted,
}: {
  prices: Record<string, PriceData>;
  mounted: boolean;
}) {
  const btcData = prices["BTC-USDT"] ?? FALLBACK_PRICES["BTC-USDT"];
  const btcPrice = btcData.price;
  const btcChange = btcData.change_24h;
  const isUp = btcChange >= 0;

  // Generate fake candlestick data around current price
  const candles = generateCandles(btcPrice, 24);

  // Fake order book around current price
  const asks = [
    { price: btcPrice * 1.0032, size: 0.142 },
    { price: btcPrice * 1.0021, size: 0.387 },
    { price: btcPrice * 1.0009, size: 0.821 },
  ];
  const bids = [
    { price: btcPrice * 0.9991, size: 1.204 },
    { price: btcPrice * 0.9979, size: 0.632 },
    { price: btcPrice * 0.9967, size: 0.278 },
  ];

  const high24h = btcData.high_24h ?? btcPrice * 1.018;
  const low24h  = btcData.low_24h  ?? btcPrice * 0.982;
  const vol24h  = btcData.volume_24h ?? 28_400_000_000;

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: "#0a101e",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 0 60px -10px rgba(17,212,115,0.18), 0 32px 64px rgba(0,0,0,0.5)",
      }}
    >
      {/* Chrome bar */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(2,6,23,0.6)" }}
      >
        <div className="flex items-center gap-3">
          {/* BTC circle icon */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
            style={{ background: "rgba(247,147,26,0.15)", color: "#F7931A" }}
          >
            ₿
          </div>
          <div>
            <span className="text-xs font-bold text-dark-100">BTC/USDT</span>
            <span className="ml-2 text-[10px] text-dark-500">Perpetual</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
          <span className="text-[9px] font-bold text-primary-400 uppercase tracking-widest">LIVE</span>
        </div>
      </div>

      <div className="p-5">
        {/* Price row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-baseline gap-3">
            <span
              className="font-mono font-extrabold tabular-nums"
              style={{ fontSize: "28px", letterSpacing: "-0.5px", color: "#f0f4f8" }}
            >
              {mounted ? `$${fmt(btcPrice)}` : "$--,---"}
            </span>
            <span
              className={`font-mono text-sm font-bold px-2 py-0.5 rounded ${
                isUp
                  ? "bg-profit-500/10 text-profit-400"
                  : "bg-loss-500/10 text-loss-400"
              }`}
            >
              {isUp ? "+" : ""}{btcChange.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Candlestick chart */}
        <div
          className="relative mb-4 rounded-xl overflow-hidden"
          style={{ height: "160px", background: "#060d1a" }}
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <div
              key={y}
              className="absolute left-0 right-0"
              style={{
                top: `${y}%`,
                borderTop: "1px solid rgba(255,255,255,0.03)",
              }}
            />
          ))}

          {/* Candlestick bars */}
          <svg
            viewBox={`0 0 ${candles.length * 12} 160`}
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <linearGradient id="candleGlowUp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#11d473" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="candleGlowDown" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#e11d48" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            {candles.map((c, i) => {
              const x = i * 12 + 2;
              const upColor = isUp ? "url(#candleGlowUp)" : "url(#candleGlowDown)";
              const clr = c.close >= c.open ? upColor : "url(#candleGlowDown)";
              const bodyTop = Math.min(c.openY, c.closeY);
              const bodyH = Math.max(Math.abs(c.closeY - c.openY), 2);
              return (
                <g key={i}>
                  {/* Wick */}
                  <line
                    x1={x + 4}
                    y1={c.highY}
                    x2={x + 4}
                    y2={c.lowY}
                    stroke={c.close >= c.open ? "#11d473" : "#f43f5e"}
                    strokeWidth="0.5"
                    opacity="0.6"
                  />
                  {/* Body */}
                  <rect
                    x={x}
                    y={bodyTop}
                    width="8"
                    height={bodyH}
                    fill={clr}
                    rx="0.5"
                  />
                </g>
              );
            })}
            {/* Last price line */}
            <line
              x1="0"
              y1={candles[candles.length - 1]?.closeY ?? 80}
              x2={candles.length * 12}
              y2={candles[candles.length - 1]?.closeY ?? 80}
              stroke="#11d473"
              strokeWidth="0.5"
              strokeDasharray="3,3"
              opacity="0.5"
            />
          </svg>

          {/* Price label at right edge */}
          <div
            className="absolute right-2 font-mono text-[9px] font-bold text-primary-400"
            style={{ top: `${(candles[candles.length - 1]?.closeY ?? 80) - 8}px` }}
          >
            {mounted ? `$${fmt(btcPrice)}` : ""}
          </div>
        </div>

        {/* 24h stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "24h High", value: mounted ? `$${fmt(high24h)}` : "--", color: "text-profit-400" },
            { label: "24h Low",  value: mounted ? `$${fmt(low24h)}`  : "--", color: "text-loss-400" },
            { label: "Volume",   value: mounted ? fmtCompact(vol24h)  : "--", color: "text-dark-200" },
          ].map((s, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <span className="text-[9px] text-dark-600 uppercase tracking-wider">{s.label}</span>
              <span className={`font-mono text-[11px] font-semibold ${s.color} tabular-nums`}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Order book */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.04)", background: "#06101f" }}
        >
          {/* Header */}
          <div className="grid grid-cols-2 px-3 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span className="text-[9px] text-dark-500 uppercase tracking-wider">Price (USDT)</span>
            <span className="text-[9px] text-dark-500 uppercase tracking-wider text-right">Size (BTC)</span>
          </div>

          {/* Asks */}
          {asks.map((a, i) => (
            <div
              key={i}
              className="grid grid-cols-2 px-3 py-1 relative"
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `rgba(244,63,94,0.04)`,
                  width: `${30 + i * 20}%`,
                }}
              />
              <span className="font-mono text-[11px] text-loss-400 relative z-10 tabular-nums">
                {mounted ? fmt(a.price) : "------"}
              </span>
              <span className="font-mono text-[11px] text-dark-300 text-right relative z-10 tabular-nums">
                {a.size.toFixed(3)}
              </span>
            </div>
          ))}

          {/* Spread / current price row */}
          <div
            className="grid grid-cols-2 px-3 py-2"
            style={{
              background: "rgba(17,212,115,0.06)",
              borderTop: "1px solid rgba(17,212,115,0.12)",
              borderBottom: "1px solid rgba(17,212,115,0.12)",
            }}
          >
            <span className="font-mono text-sm font-bold text-primary-400 tabular-nums">
              {mounted ? fmt(btcPrice) : "------"}
            </span>
            <span className="text-[10px] text-dark-500 text-right self-center">Last Trade</span>
          </div>

          {/* Bids */}
          {bids.map((b, i) => (
            <div key={i} className="grid grid-cols-2 px-3 py-1 relative">
              <div
                className="absolute inset-0"
                style={{
                  background: `rgba(17,212,115,0.04)`,
                  width: `${50 - i * 15}%`,
                }}
              />
              <span className="font-mono text-[11px] text-profit-400 relative z-10 tabular-nums">
                {mounted ? fmt(b.price) : "------"}
              </span>
              <span className="font-mono text-[11px] text-dark-300 text-right relative z-10 tabular-nums">
                {b.size.toFixed(3)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Glow strip at bottom */}
      <div
        className="h-px w-full"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(17,212,115,0.3), transparent)",
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKETS TABLE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function MarketsTable({
  prices,
  mounted,
}: {
  prices: Record<string, PriceData>;
  mounted: boolean;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.06)", background: "#0a101e" }}
    >
      {/* Table header */}
      <div
        className="grid px-6 py-3"
        style={{
          gridTemplateColumns: "40px 2fr 1.5fr 1fr 1.5fr 1.5fr 100px 100px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(2,6,23,0.4)",
        }}
      >
        {["#", "Asset", "Price", "24h Change", "24h Volume", "Market Cap", "7D Chart", ""].map((h, i) => (
          <span key={i} className="text-[10px] font-bold text-dark-500 uppercase tracking-wider">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {COINS.map((coin, idx) => {
        const p = prices[coin.symbol] ?? FALLBACK_PRICES[coin.symbol];
        const isUp = p.change_24h >= 0;
        const mcap = MARKET_CAPS[coin.symbol] ?? 0;
        const vol = p.volume_24h ?? 0;
        const sparkData = SPARKLINES[coin.symbol] ?? [];

        return (
          <div
            key={coin.symbol}
            className="group grid px-6 py-4 items-center cursor-pointer transition-colors"
            style={{
              gridTemplateColumns: "40px 2fr 1.5fr 1fr 1.5fr 1.5fr 100px 100px",
              borderBottom: idx < COINS.length - 1 ? "1px solid rgba(255,255,255,0.035)" : "none",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = "transparent";
            }}
          >
            {/* Rank */}
            <span className="text-xs text-dark-600 tabular-nums font-mono">{idx + 1}</span>

            {/* Asset */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: `${coin.color}18`, color: coin.color, border: `1px solid ${coin.color}30` }}
              >
                {coin.short.charAt(0)}
              </div>
              <div>
                <span className="text-sm font-semibold text-dark-100">{coin.name}</span>
                <span className="block text-xs text-dark-500">{coin.short}/USDT</span>
              </div>
            </div>

            {/* Price */}
            <span className="font-mono text-sm font-semibold text-dark-50 tabular-nums">
              {mounted ? `$${fmt(p.price)}` : "---"}
            </span>

            {/* 24h Change */}
            <span
              className={`font-mono text-sm font-bold tabular-nums flex items-center gap-1 ${
                isUp ? "text-profit-400" : "text-loss-400"
              }`}
            >
              {isUp ? "▲" : "▼"}
              {Math.abs(p.change_24h).toFixed(2)}%
            </span>

            {/* Volume */}
            <span className="font-mono text-sm text-dark-400 tabular-nums">
              {mounted && vol ? fmtCompact(vol) : "---"}
            </span>

            {/* Market cap */}
            <span className="font-mono text-sm text-dark-400 tabular-nums">
              {mounted ? fmtCompact(mcap) : "---"}
            </span>

            {/* 7D Sparkline */}
            <div className="flex items-center">
              <Sparkline data={sparkData} isUp={isUp} />
            </div>

            {/* Action */}
            <div className="flex justify-end">
              <a
                href="/trade"
                className="t0-btn t0-btn-primary t0-btn-sm text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Trade
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPARKLINE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function Sparkline({ data, isUp }: { data: number[]; isUp: boolean }) {
  if (!data.length) return null;
  const w = 80;
  const h = 32;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h * 0.85 - h * 0.075;
    return `${x},${y}`;
  });
  const polyline = pts.join(" ");
  const color = isUp ? "#11d473" : "#f43f5e";
  const fillId = `spark-fill-${isUp ? "up" : "dn"}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <polygon
        points={`0,${h} ${polyline} ${w},${h}`}
        fill={`url(#${fillId})`}
      />
      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function FeatureCard({
  icon,
  label,
  desc,
  accent,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  accent: string;
  delay: number;
}) {
  return (
    <div
      className="group relative rounded-xl p-7 cursor-default transition-all duration-300 hover:-translate-y-1"
      style={{
        background: "#0a101e",
        border: "1px solid rgba(255,255,255,0.05)",
        borderLeft: `3px solid ${accent}`,
        animationDelay: `${delay}ms`,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = `0 8px 32px rgba(0,0,0,0.4), 4px 0 20px ${accent}18`;
        el.style.borderColor = `rgba(255,255,255,0.08)`;
        el.style.borderLeftColor = accent;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = "";
        el.style.borderColor = "rgba(255,255,255,0.05)";
        el.style.borderLeftColor = accent;
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-colors"
        style={{ background: `${accent}14`, color: accent }}
      >
        {icon}
      </div>
      <h3 className="text-base font-bold text-dark-100 mb-2">{label}</h3>
      <p className="text-sm text-dark-400 leading-relaxed">{desc}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Generate candle data for chart
// ═══════════════════════════════════════════════════════════════════════════════
interface Candle {
  open: number;
  close: number;
  high: number;
  low: number;
  openY: number;
  closeY: number;
  highY: number;
  lowY: number;
}

function generateCandles(currentPrice: number, count: number): Candle[] {
  const chartHeight = 160;
  const pad = 12;

  // Build a series of prices that trends toward currentPrice
  const prices: number[] = [currentPrice * 0.975];
  for (let i = 1; i < count; i++) {
    const prev = prices[i - 1];
    const drift = (currentPrice - prev) / (count - i + 1);
    const noise = prev * 0.004 * (Math.random() - 0.45);
    prices.push(prev + drift + noise);
  }

  // Find price range for Y scaling
  const allPrices = prices.flatMap((p) => [p * 0.997, p * 1.003]);
  const priceMin = Math.min(...allPrices);
  const priceMax = Math.max(...allPrices);
  const priceRange = priceMax - priceMin || 1;

  const toY = (p: number) =>
    chartHeight - pad - ((p - priceMin) / priceRange) * (chartHeight - pad * 2);

  return prices.map((close, i) => {
    const open = i === 0 ? close * (1 - 0.003) : prices[i - 1];
    const high = Math.max(open, close) * (1 + 0.002 + Math.random() * 0.003);
    const low  = Math.min(open, close) * (1 - 0.002 - Math.random() * 0.003);
    return {
      open,
      close,
      high,
      low,
      openY:  toY(open),
      closeY: toY(close),
      highY:  toY(high),
      lowY:   toY(low),
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE ICONS
// ═══════════════════════════════════════════════════════════════════════════════
function IconSatellite() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="19" r="2" />
      <path d="M5 17A12 12 0 0 1 17 5" />
      <path d="M5 13A8 8 0 0 1 13 5" />
      <path d="M5 9a4 4 0 0 1 4-4" />
      <rect x="14" y="2" width="8" height="6" rx="1" />
      <path d="m22 8-4 4" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function IconBrain() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function IconTarget() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function IconTrophy() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}
