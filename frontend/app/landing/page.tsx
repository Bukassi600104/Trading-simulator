"use client";

import AuthModal from "@/components/AuthModal";
import { useAuthStore } from "@/stores/authStore";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

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

function LandingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<"login" | "register">("register");
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || isAuthenticated) return;
    const auth = searchParams.get("auth");
    if (auth === "login" || auth === "register") {
      setAuthInitialTab(auth);
      setAuthModalOpen(true);
    }
  }, [mounted, isAuthenticated, searchParams]);

  const handleGetStarted = () => {
    if (isAuthenticated) router.push("/dashboard");
    else { setAuthInitialTab("register"); setAuthModalOpen(true); }
  };

  const handleSignIn = () => {
    setAuthInitialTab("login");
    setAuthModalOpen(true);
  };

  const features = [
    { icon: <FeatureIconLive />, title: "Real-Time Data", desc: "Live price feeds from Bybit exchange with sub-second WebSocket updates across 6 trading pairs.", accent: "primary" },
    { icon: <FeatureIconTarget />, title: "Prop Challenges", desc: "FTMO-style evaluation with drawdown limits, profit targets, and consistency rules.", accent: "amber" },
    { icon: <FeatureIconJournal />, title: "Smart Journal", desc: "Every trade auto-logged with charts, psychology tags, and AI-powered performance insights.", accent: "lavender" },
    { icon: <FeatureIconReplay />, title: "Bar Replay", desc: "Practice on historical data. Perfect entries on past market moves at your own pace.", accent: "coral" },
    { icon: <FeatureIconRisk />, title: "Risk Calculator", desc: "Position sizing based on your risk tolerance. Dynamic margin and liquidation estimates.", accent: "primary" },
    { icon: <FeatureIconTrophy />, title: "Clan Rankings", desc: "Form clans, compete on leaderboards, and climb the ranks together.", accent: "amber" },
  ];

  return (
    <div className="relative min-h-screen bg-t0-void overflow-x-hidden">
      {/* Ambient background */}
      <div className="t0-ambient" />
      <div className="fixed inset-0 bg-grid-dots bg-grid pointer-events-none z-0 opacity-60" />

      {/* ─── NAV ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-header">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center font-mono font-bold text-t0-void text-lg tracking-tight">
              T<span className="opacity-60">0</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-dark-50">Terminal Zero</span>
          </div>

          <div className="hidden md:flex items-center gap-10">
            <a href="#features" className="text-sm font-medium text-dark-400 hover:text-primary-400 transition-colors">Features</a>
            <a href="#process" className="text-sm font-medium text-dark-400 hover:text-primary-400 transition-colors">How It Works</a>
            <a href="/pricing" className="text-sm font-medium text-dark-400 hover:text-primary-400 transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            {mounted && isAuthenticated ? (
              <button onClick={() => router.push("/dashboard")} className="t0-btn t0-btn-primary">
                Dashboard
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            ) : (
              <>
                <button onClick={handleSignIn} className="t0-btn t0-btn-ghost text-dark-300 border border-dark-700 hover:border-primary-500 hover:text-primary-400">Sign In</button>
                <button onClick={handleGetStarted} className="t0-btn t0-btn-primary">Start Free</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative z-10 min-h-screen max-w-[1400px] mx-auto px-8 pt-32 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="max-w-[560px] animate-slide-up">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-primary-500/20 bg-primary-500/8 mb-7">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            <span className="text-xs font-semibold text-primary-400 tracking-wide">LIVE MARKET DATA &middot; ZERO RISK</span>
          </div>

          <h1 className="text-5xl lg:text-[60px] font-extrabold leading-[1.05] tracking-[-2px] mb-6">
            <span className="block text-dark-50">Master the Markets.</span>
            <span className="block text-gradient">Zero Risk.</span>
          </h1>

          <p className="text-lg leading-relaxed text-dark-400 mb-9">
            Professional crypto trading simulator with real-time Bybit data and $10,000 in simulated capital.
            Built for prop firm prep, strategy testing, and deliberate skill development.
          </p>

          <div className="mb-12">
            <button onClick={handleGetStarted} className="t0-btn t0-btn-primary t0-btn-lg group">
              <span>Start Trading Free</span>
              <svg className="transition-transform group-hover:translate-x-1" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4.167 10h11.666M10 4.167L15.833 10 10 15.833" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="block mt-3 text-sm text-dark-500">No credit card required</span>
          </div>

          <div className="flex items-center gap-8">
            {[
              { value: "$10K", label: "Starting Capital" },
              { value: "6", label: "Trading Pairs" },
              { value: "<1s", label: "Latency" },
            ].map((m, i) => (
              <div key={i} className="flex flex-col gap-1">
                <span className="font-mono text-2xl font-bold text-primary-400">{m.value}</span>
                <span className="text-xs text-dark-500">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Terminal Preview Card */}
        <div className="animate-slide-up delay-200 relative">
          <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-t0-depth shadow-terminal">
            {/* Chrome bar */}
            <div className="flex items-center px-4 py-3 bg-t0-void/80 border-b border-white/[0.05]">
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-coral-500" />
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="w-3 h-3 rounded-full bg-primary-500" />
              </div>
              <span className="flex-1 text-center font-mono text-xs text-dark-500">T0 — BTC-USDT Perpetual</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                <span className="text-[10px] font-bold text-primary-400 uppercase tracking-wider">Live</span>
              </div>
            </div>

            {/* Body */}
            <div className="p-5">
              {/* Price row */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-semibold text-dark-500">BTC</span>
                  <span className="font-mono text-3xl font-bold text-dark-50">98,245.50</span>
                  <span className="font-mono text-sm font-semibold text-profit-400 bg-profit-400/10 px-2.5 py-1 rounded-md">+2.45%</span>
                </div>
                <div className="flex gap-5 text-right">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-dark-600">24h High</span>
                    <span className="font-mono text-xs text-dark-400">99,120.00</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-dark-600">24h Low</span>
                    <span className="font-mono text-xs text-dark-400">95,880.00</span>
                  </div>
                </div>
              </div>

              {/* Chart mockup */}
              <div className="relative h-44 rounded-xl bg-t0-void mb-4 overflow-hidden">
                <div className="absolute inset-0 bg-grid-dots bg-grid opacity-30" />
                <div className="absolute bottom-0 left-0 right-0 h-full flex items-end gap-1 px-4 pb-3">
                  {[68, 45, 72, 82, 55, 78, 90, 62, 85, 48, 75, 88, 52, 70, 95, 60, 80, 42, 76, 85, 65, 92].map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 min-w-[4px] rounded-sm transition-all duration-300 ${
                        i % 3 === 1 ? "bg-gradient-to-t from-loss-600 to-loss-400" : "bg-gradient-to-t from-profit-600 to-profit-400"
                      }`}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                {/* Entry line */}
                <div className="absolute top-[45%] left-0 right-0 border-t border-dashed border-primary-500/40">
                  <span className="absolute -top-2.5 right-2 text-[9px] font-mono text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded">Entry 97,120</span>
                </div>
              </div>

              {/* Position card */}
              <div className="rounded-xl bg-t0-void/60 border border-white/[0.05] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-dark-500">Open Position</span>
                  <span className="t0-badge t0-badge-profit text-[10px]">LONG 10x</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Entry", value: "97,120.00" },
                    { label: "Size", value: "0.15 BTC" },
                    { label: "P&L", value: "+$168.82", profit: true },
                  ].map((d, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <span className="text-[10px] text-dark-600">{d.label}</span>
                      <span className={`font-mono text-sm font-semibold ${d.profit ? "text-profit-400" : "text-dark-100"}`}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Glow effect behind terminal */}
          <div className="absolute -inset-8 -z-10 rounded-3xl bg-primary-500/[0.04] blur-3xl" />
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="relative z-10 max-w-[1200px] mx-auto px-8 py-24">
        <div className="text-center max-w-xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary-500/10 text-[11px] font-bold text-primary-400 uppercase tracking-widest mb-5">Features</span>
          <h2 className="text-4xl font-extrabold text-dark-50 tracking-tight mb-4">Engineered for Serious Traders</h2>
          <p className="text-lg text-dark-400 leading-relaxed">Everything you need to develop, test, and refine your trading edge.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={i} className="group t0-card p-7 animate-slide-up relative overflow-hidden" style={{ animationDelay: `${i * 80}ms` }}>
              <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${
                f.accent === "primary" ? "from-primary-500 to-primary-300" :
                f.accent === "amber" ? "from-amber-500 to-amber-400" :
                f.accent === "lavender" ? "from-lavender-600 to-lavender-400" :
                "from-coral-500 to-coral-400"
              } opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="mb-4 text-dark-400 group-hover:text-primary-400 transition-colors">{f.icon}</div>
              <h3 className="text-base font-bold text-dark-100 mb-2">{f.title}</h3>
              <p className="text-sm text-dark-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="process" className="relative z-10 max-w-[900px] mx-auto px-8 py-20">
        <div className="text-center max-w-xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 text-[11px] font-bold text-amber-400 uppercase tracking-widest mb-5">How It Works</span>
          <h2 className="text-4xl font-extrabold text-dark-50 tracking-tight">Zero to Trading in 60 Seconds</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { num: "01", title: "Create Account", desc: "Quick signup with email. Completely free, no card required." },
            { num: "02", title: "Get Funded", desc: "$10,000 in simulated capital loaded into your portfolio instantly." },
            { num: "03", title: "Start Trading", desc: "Execute trades on live markets with real-time Bybit data. Zero risk." },
          ].map((step, i) => (
            <div key={i} className="text-center animate-slide-up" style={{ animationDelay: `${i * 120}ms` }}>
              <span className="block font-mono text-5xl font-bold text-primary-500/20 mb-5">{step.num}</span>
              <h3 className="text-lg font-bold text-dark-100 mb-3">{step.title}</h3>
              <p className="text-sm text-dark-400 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative z-10 px-8 py-20">
        <div className="max-w-[700px] mx-auto text-center p-16 rounded-3xl bg-gradient-to-br from-primary-500/[0.06] to-lavender-500/[0.03] border border-primary-500/15">
          <h2 className="text-3xl font-extrabold text-dark-50 mb-3 tracking-tight">Ready to Level Up?</h2>
          <p className="text-lg text-dark-400 mb-8">Join thousands of traders practicing risk-free every day.</p>
          <button onClick={handleGetStarted} className="t0-btn t0-btn-primary t0-btn-lg group">
            <span>Start Trading Now</span>
            <svg className="transition-transform group-hover:translate-x-1" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4.167 10h11.666M10 4.167L15.833 10 10 15.833" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 border-t border-white/[0.05] py-10 px-8">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center font-mono font-bold text-t0-void text-sm">T<span className="opacity-60">0</span></div>
            <span className="font-semibold text-dark-100">Terminal Zero</span>
          </div>
          <p className="text-xs text-dark-600">Trading simulator for educational purposes. No real funds involved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-dark-500 hover:text-primary-400 transition-colors">Terms</a>
            <a href="#" className="text-xs text-dark-500 hover:text-primary-400 transition-colors">Privacy</a>
            <a href="#" className="text-xs text-dark-500 hover:text-primary-400 transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialTab={authInitialTab} />
    </div>
  );
}

/* ─── Feature Icons (SVG) ─── */
function FeatureIconLive() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function FeatureIconTarget() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function FeatureIconJournal() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
function FeatureIconReplay() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}
function FeatureIconRisk() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function FeatureIconTrophy() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}
