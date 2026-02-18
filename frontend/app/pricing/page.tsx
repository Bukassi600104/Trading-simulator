"use client";

import AuthModal from "@/components/AuthModal";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="loading-screen">
          <div className="t0-spinner" />
        </div>
      }
    >
      <PricingPageInner />
    </Suspense>
  );
}

/* ─── Data ─── */

const practiceFeaturesShort = [
  "Live market streaming (6 pairs)",
  "$10,000 simulated capital",
  "Paper trading with live data",
  "Basic trade journal",
  "Community access",
];

const proFeaturesShort = [
  "Everything in Practice Mode",
  "Advanced analytics dashboard",
  "Bar Replay (historical practice)",
  "AI-powered journal insights",
  "Higher leverage options (up to 50x)",
  "Priority WebSocket connections",
  "Clan creation & leadership",
  "Custom risk profiles",
];

const evalFeaturesShort = [
  "Everything in Professional",
  "FTMO-style evaluation account",
  "Path to $100k funded account",
  "Drawdown & consistency rules",
  "Performance scorecard & reports",
  "Dedicated evaluation dashboard",
  "Certificate on completion",
];

const comparisonFeatures = [
  { name: "Live Market Data", free: true, pro: true, eval: true },
  { name: "Paper Trading", free: true, pro: true, eval: true },
  { name: "Trade Journal", free: true, pro: true, eval: true },
  { name: "Simulated Capital", free: "$10K", pro: "$100K", eval: "$100K" },
  { name: "Max Leverage", free: "10x", pro: "50x", eval: "50x" },
  { name: "Bar Replay", free: false, pro: true, eval: true },
  { name: "AI Journal Insights", free: false, pro: true, eval: true },
  { name: "Advanced Analytics", free: false, pro: true, eval: true },
  { name: "Clan Leadership", free: false, pro: true, eval: true },
  { name: "Priority Connections", free: false, pro: true, eval: true },
  { name: "Prop Evaluation", free: false, pro: false, eval: true },
  { name: "Performance Reports", free: false, pro: false, eval: true },
  { name: "Funded Account Path", free: false, pro: false, eval: true },
];

const faqItems = [
  {
    q: "Is the Practice Mode really free forever?",
    a: "Yes. Practice Mode gives you full access to live market data, paper trading with $10,000 in simulated capital, and a basic trade journal. No credit card required, no time limits, no catch.",
  },
  {
    q: "What happens after I complete the Prop Firm Evaluation?",
    a: "Upon meeting all evaluation criteria (profit targets, drawdown limits, consistency rules), you receive a certificate of completion and become eligible for our funded account program with up to $100,000 in simulated trading capital.",
  },
  {
    q: "Can I switch between plans at any time?",
    a: "Absolutely. You can upgrade from Practice to Professional at any time. The Prop Firm Evaluation is a separate one-time purchase that can be added to any plan. Downgrades take effect at the end of your billing cycle.",
  },
  {
    q: "What trading pairs are available?",
    a: "All plans include access to 6 major crypto perpetual pairs via real-time Bybit data: BTC-USDT, ETH-USDT, SOL-USDT, XRP-USDT, DOGE-USDT, and ADA-USDT. Sub-second WebSocket updates on all pairs.",
  },
  {
    q: "Is there a yearly discount?",
    a: "Yes! The Professional plan is available at $15/month when billed yearly, saving you 20% compared to monthly billing. The Prop Firm Evaluation is always a one-time fee regardless of billing cycle.",
  },
];

/* ─── Component ─── */

function PricingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<"login" | "register">("register");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const authParam = useMemo(() => searchParams.get("auth"), [searchParams]);

  useEffect(() => {
    if (!mounted || isAuthenticated) return;
    if (authParam === "login" || authParam === "register") {
      setAuthInitialTab(authParam);
      setAuthModalOpen(true);
    }
  }, [authParam, isAuthenticated, mounted]);

  const handleGetStarted = () => {
    if (isAuthenticated) router.push("/dashboard");
    else { setAuthInitialTab("register"); setAuthModalOpen(true); }
  };

  const handleSignIn = () => {
    setAuthInitialTab("login");
    setAuthModalOpen(true);
  };

  const proPrice = billingCycle === "monthly" ? 19 : 15;
  const proPeriod = billingCycle === "monthly" ? "/mo" : "/mo";
  const proBillingNote = billingCycle === "yearly" ? "Billed $180/year" : "Billed monthly";

  return (
    <div className="relative min-h-screen bg-t0-void overflow-x-hidden">
      {/* Ambient background */}
      <div className="t0-ambient" />
      <div className="fixed inset-0 bg-grid-dots bg-grid pointer-events-none z-0 opacity-60" />

      {/* ─── NAV (same as landing) ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-header">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-8 py-4">
          <Link href="/landing" className="flex items-center gap-3.5 no-underline">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center font-mono font-bold text-t0-void text-lg tracking-tight">
              T<span className="opacity-60">0</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-dark-50">Terminal Zero</span>
          </Link>

          <div className="hidden md:flex items-center gap-10">
            <Link href="/landing#features" className="text-sm font-medium text-dark-400 hover:text-primary-400 transition-colors no-underline">Features</Link>
            <Link href="/landing#process" className="text-sm font-medium text-dark-400 hover:text-primary-400 transition-colors no-underline">How It Works</Link>
            <Link href="/pricing" className="text-sm font-medium text-primary-400 transition-colors no-underline">Pricing</Link>
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
      <section className="relative z-10 pt-36 pb-8 text-center px-6">
        <div className="max-w-2xl mx-auto animate-slide-up">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-primary-500/20 bg-primary-500/[0.08] mb-7">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            <span className="text-xs font-semibold text-primary-400 tracking-wide uppercase">Transparent Pricing</span>
          </div>

          <h1 className="text-5xl lg:text-[56px] font-extrabold leading-[1.08] tracking-[-2px] mb-5">
            <span className="text-dark-50">Engineered for </span>
            <span className="text-gradient">Success</span>
          </h1>

          <p className="text-lg text-dark-400 leading-relaxed max-w-lg mx-auto">
            Choose the plan that matches your ambition. Start free, upgrade when you are ready to sharpen your edge.
          </p>
        </div>
      </section>

      {/* ─── BILLING TOGGLE ─── */}
      <section className="relative z-10 flex justify-center px-6 mb-14">
        <div className="inline-flex items-center gap-4 p-1.5 rounded-full bg-t0-depth border border-white/[0.06]">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
              billingCycle === "monthly"
                ? "bg-gradient-to-r from-primary-500 to-primary-600 text-t0-void shadow-glow-primary"
                : "text-dark-400 hover:text-dark-200"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              billingCycle === "yearly"
                ? "bg-gradient-to-r from-primary-500 to-primary-600 text-t0-void shadow-glow-primary"
                : "text-dark-400 hover:text-dark-200"
            }`}
          >
            Yearly
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
              Save 20%
            </span>
          </button>
        </div>
      </section>

      {/* ─── PRICING CARDS ─── */}
      <section className="relative z-10 max-w-[1200px] mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ── Practice Mode (Free) ── */}
          <div className="animate-slide-up rounded-2xl border border-white/[0.06] bg-t0-depth p-8 flex flex-col relative overflow-hidden group hover:border-white/[0.12] transition-all duration-300">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary-500/60 to-primary-300/30" />

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-dark-50">Practice Mode</h3>
                <p className="text-xs text-dark-500">Get started risk-free</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-5xl font-extrabold text-dark-50 tracking-tight">$0</span>
              </div>
              <p className="text-sm text-dark-500 mt-1">Free forever</p>
            </div>

            <ul className="flex-1 space-y-3 mb-8">
              {practiceFeaturesShort.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-dark-300">
                  <svg className="w-5 h-5 text-primary-500 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            {!isAuthenticated ? (
              <button
                onClick={handleGetStarted}
                className="w-full py-3.5 rounded-xl border-2 border-primary-500/40 text-primary-400 font-bold text-sm hover:bg-primary-500/10 hover:border-primary-500/60 transition-all duration-200"
              >
                Start Free
              </button>
            ) : (
              <Link
                href="/dashboard"
                className="w-full py-3.5 rounded-xl border-2 border-primary-500/40 text-primary-400 font-bold text-sm text-center hover:bg-primary-500/10 hover:border-primary-500/60 transition-all duration-200 no-underline block"
              >
                Go to Dashboard
              </Link>
            )}
          </div>

          {/* ── Professional Trader (Highlighted) ── */}
          <div
            className="animate-slide-up rounded-2xl p-8 flex flex-col relative overflow-hidden lg:-mt-4 lg:mb-0"
            style={{ animationDelay: "100ms" }}
          >
            {/* Glow border effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-amber-500/30 via-amber-400/10 to-primary-500/10 p-[1px]">
              <div className="w-full h-full rounded-2xl bg-t0-depth" />
            </div>

            {/* Ambient glow behind card */}
            <div className="absolute -inset-6 -z-10 rounded-3xl bg-amber-500/[0.06] blur-3xl" />

            {/* Content (on top of border trick) */}
            <div className="relative z-10 flex flex-col h-full">
              {/* Recommended badge */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-dark-50">Professional Trader</h3>
                    <p className="text-xs text-dark-500">For serious traders</p>
                  </div>
                </div>
                <span className="t0-badge t0-badge-amber text-[10px]">Recommended</span>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-5xl font-extrabold text-dark-50 tracking-tight">${proPrice}</span>
                  <span className="text-lg text-dark-500 font-medium">{proPeriod}</span>
                </div>
                <p className="text-sm text-dark-500 mt-1">{proBillingNote}</p>
              </div>

              <ul className="flex-1 space-y-3 mb-8">
                {proFeaturesShort.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-dark-300">
                    <svg className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {!isAuthenticated ? (
                <button
                  onClick={handleGetStarted}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-t0-void font-bold text-sm shadow-glow-primary hover:shadow-glow-primary-lg hover:scale-[1.02] transition-all duration-200"
                >
                  Go Professional
                </button>
              ) : (
                <Link
                  href="/dashboard"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-t0-void font-bold text-sm text-center shadow-glow-primary hover:shadow-glow-primary-lg hover:scale-[1.02] transition-all duration-200 no-underline block"
                >
                  Upgrade in Dashboard
                </Link>
              )}
            </div>
          </div>

          {/* ── Prop Firm Evaluation ── */}
          <div
            className="animate-slide-up rounded-2xl border border-lavender-600/20 bg-t0-depth p-8 flex flex-col relative overflow-hidden group hover:border-lavender-500/30 transition-all duration-300"
            style={{ animationDelay: "200ms" }}
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-lavender-500/60 to-lavender-400/30" />

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-lavender-500/10 border border-lavender-500/20 flex items-center justify-center text-lavender-400">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-dark-50">Prop Firm Evaluation</h3>
                <p className="text-xs text-dark-500">Path to $100K account</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-5xl font-extrabold text-dark-50 tracking-tight">$99</span>
              </div>
              <p className="text-sm text-dark-500 mt-1">One-time fee</p>
            </div>

            <ul className="flex-1 space-y-3 mb-8">
              {evalFeaturesShort.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-dark-300">
                  <svg className="w-5 h-5 text-lavender-400 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            {!isAuthenticated ? (
              <button
                onClick={handleGetStarted}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-lavender-600 to-lavender-500 text-dark-50 font-bold text-sm shadow-glow-lavender hover:shadow-[0_0_30px_rgba(184,184,255,0.35)] hover:scale-[1.02] transition-all duration-200"
              >
                Start Evaluation
              </button>
            ) : (
              <Link
                href="/challenge"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-lavender-600 to-lavender-500 text-dark-50 font-bold text-sm text-center shadow-glow-lavender hover:shadow-[0_0_30px_rgba(184,184,255,0.35)] hover:scale-[1.02] transition-all duration-200 no-underline block"
              >
                Open Evaluation
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ─── FEATURE COMPARISON TABLE ─── */}
      <section className="relative z-10 max-w-[1000px] mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary-500/10 text-[11px] font-bold text-primary-400 uppercase tracking-widest mb-5">
            Compare Plans
          </span>
          <h2 className="text-3xl font-extrabold text-dark-50 tracking-tight">Feature Breakdown</h2>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-t0-depth overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-white/[0.06] bg-t0-void/40">
            <div className="text-sm font-semibold text-dark-400">Feature</div>
            <div className="text-sm font-semibold text-dark-400 text-center">Practice</div>
            <div className="text-sm font-semibold text-amber-400 text-center">Professional</div>
            <div className="text-sm font-semibold text-lavender-400 text-center">Evaluation</div>
          </div>

          {/* Table rows */}
          {comparisonFeatures.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-4 gap-4 px-6 py-3.5 ${
                i !== comparisonFeatures.length - 1 ? "border-b border-white/[0.04]" : ""
              } ${i % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"}`}
            >
              <div className="text-sm text-dark-300">{row.name}</div>
              <div className="flex justify-center">
                <ComparisonCell value={row.free} />
              </div>
              <div className="flex justify-center">
                <ComparisonCell value={row.pro} accent="amber" />
              </div>
              <div className="flex justify-center">
                <ComparisonCell value={row.eval} accent="lavender" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="relative z-10 max-w-[720px] mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 text-[11px] font-bold text-amber-400 uppercase tracking-widest mb-5">
            FAQ
          </span>
          <h2 className="text-3xl font-extrabold text-dark-50 tracking-tight">Common Questions</h2>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, i) => (
            <div
              key={i}
              className={`rounded-xl border transition-all duration-200 ${
                openFaq === i
                  ? "border-primary-500/20 bg-primary-500/[0.03]"
                  : "border-white/[0.06] bg-t0-depth hover:border-white/[0.1]"
              }`}
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <span className="text-sm font-semibold text-dark-100 pr-4">{item.q}</span>
                <svg
                  className={`w-5 h-5 text-dark-500 shrink-0 transition-transform duration-200 ${
                    openFaq === i ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5 animate-fade-in">
                  <p className="text-sm text-dark-400 leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── BOTTOM CTA ─── */}
      <section className="relative z-10 px-8 pb-24">
        <div className="max-w-[700px] mx-auto text-center p-16 rounded-3xl bg-gradient-to-br from-primary-500/[0.06] to-lavender-500/[0.03] border border-primary-500/15">
          <h2 className="text-3xl font-extrabold text-dark-50 mb-3 tracking-tight">Ready to Start Trading?</h2>
          <p className="text-lg text-dark-400 mb-8">Join thousands of traders sharpening their skills every day.</p>
          <button onClick={handleGetStarted} className="t0-btn t0-btn-primary t0-btn-lg group">
            <span>Create Free Account</span>
            <svg className="transition-transform group-hover:translate-x-1" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4.167 10h11.666M10 4.167L15.833 10 10 15.833" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="block mt-3 text-sm text-dark-500">No credit card required</span>
        </div>
      </section>

      {/* ─── FOOTER (same as landing) ─── */}
      <footer className="relative z-10 border-t border-white/[0.05] py-10 px-8">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center font-mono font-bold text-t0-void text-sm">
              T<span className="opacity-60">0</span>
            </div>
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

/* ─── Comparison Cell ─── */
function ComparisonCell({ value, accent }: { value: boolean | string; accent?: "amber" | "lavender" }) {
  if (typeof value === "string") {
    return <span className="text-sm font-mono font-semibold text-dark-200">{value}</span>;
  }
  if (value) {
    const color = accent === "amber" ? "text-amber-400" : accent === "lavender" ? "text-lavender-400" : "text-primary-500";
    return (
      <svg className={`w-5 h-5 ${color}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5 text-dark-600" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}
