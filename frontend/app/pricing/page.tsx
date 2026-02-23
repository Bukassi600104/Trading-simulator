"use client";

import AuthModal from "@/components/AuthModal";
import { API_BASE } from "@/lib/runtimeConfig";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-t0-void">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      }
    >
      <PricingPageInner />
    </Suspense>
  );
}

/* ─── Types ─── */

type BillingCycle = "monthly" | "annual";
type PlanKey = "free" | "pro_monthly" | "pro_annual" | "elite_monthly" | "elite_annual";
type CheckoutState = "idle" | "loading" | "error";

/* ─── Feature data ─── */

const FREE_FEATURES = [
  "6 trading pairs (BTC, ETH, SOL, BNB, XRP, DOGE)",
  "$10,000 virtual starting balance",
  "15-minute delayed prices",
  "Basic portfolio tracking",
  "Paper trading simulator",
  "Community access",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Real-time market data (live prices)",
  "AI trade coaching after every trade",
  "Strategy backtesting — 90-day history",
  "Advanced analytics (Sharpe ratio, max drawdown)",
  "Multiple portfolio support",
  "Priority support",
];

const ELITE_FEATURES = [
  "Everything in Pro",
  "DeFi simulation (coming soon)",
  "Copy trading (coming soon)",
  "Custom strategy builder (coming soon)",
  "Dedicated account manager",
];

interface ComparisonRow {
  name: string;
  free: boolean | string;
  pro: boolean | string;
  elite: boolean | string;
}

const COMPARISON_FEATURES: ComparisonRow[] = [
  { name: "Trading pairs",             free: "6",            pro: "6",           elite: "6" },
  { name: "Starting virtual balance",  free: "$10,000",      pro: "$10,000",     elite: "$10,000" },
  { name: "Market data",               free: "15-min delay", pro: "Real-time",   elite: "Real-time" },
  { name: "Paper trading",             free: true,           pro: true,          elite: true },
  { name: "Basic portfolio tracking",  free: true,           pro: true,          elite: true },
  { name: "AI trade coaching",         free: false,          pro: true,          elite: true },
  { name: "Strategy backtesting",      free: false,          pro: "90 days",     elite: "90 days" },
  { name: "Sharpe ratio & drawdown",   free: false,          pro: true,          elite: true },
  { name: "Multiple portfolios",       free: false,          pro: true,          elite: true },
  { name: "Priority support",          free: false,          pro: true,          elite: true },
  { name: "Dedicated account manager", free: false,          pro: false,         elite: true },
  { name: "DeFi simulation",           free: false,          pro: false,         elite: "Coming soon" },
  { name: "Copy trading",              free: false,          pro: false,         elite: "Coming soon" },
  { name: "Custom strategy builder",   free: false,          pro: false,         elite: "Coming soon" },
];

const FAQ_ITEMS = [
  {
    q: "Is Free really free forever?",
    a: "Yes — no credit card, no time limit. You get paper trading with $10,000 virtual balance and 15-minute delayed prices on 6 pairs for as long as you like.",
  },
  {
    q: "What does '14-day free trial' mean?",
    a: "When you start a Pro or Elite trial, no payment is collected for 14 days. You can cancel at any time during the trial period and you will not be charged. After the trial your card is billed at the plan rate.",
  },
  {
    q: "How does annual billing work?",
    a: "Annual plans are billed once per year at the discounted rate (50% off vs monthly). You can cancel before the renewal date and retain access until the end of the paid year.",
  },
  {
    q: "Can I change or cancel my plan?",
    a: "Upgrade, downgrade, or cancel any time from your account settings. Downgrades take effect at the end of your current billing cycle — you keep access until then.",
  },
  {
    q: "How does NGN (Naira) pricing work?",
    a: "Nigerian users can pay in Naira via Paystack, which supports card, bank transfer, USSD, and mobile money. Naira prices are set to be affordable locally and may be adjusted periodically based on exchange rates.",
  },
  {
    q: "What is AI trade coaching?",
    a: "After every closed trade, our AI analyses your entry timing, risk/reward ratio, and trade journal notes. It surfaces patterns in your mistakes and suggests specific improvements — like a personal trading coach at a fraction of the price.",
  },
];

/* ─── Helpers ─── */

function CheckIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function XIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

function ComparisonCell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-xs font-semibold" style={{ color: "#6ee7b7" }}>{value}</span>;
  }
  if (value) {
    return <CheckIcon className="w-5 h-5 mx-auto" style={{ color: "#11d473" }} />;
  }
  return <XIcon className="w-4 h-4 mx-auto" style={{ color: "rgba(255,255,255,0.2)" }} />;
}

/* ─── Main inner component ─── */

function PricingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();

  const [mounted, setMounted] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<"login" | "register">("register");
  const [checkoutState, setCheckoutState] = useState<Record<string, CheckoutState>>({});
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isAfrican, setIsAfrican] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
      const lang = navigator.language ?? "";
      if (tz.startsWith("Africa") || lang.startsWith("ha") || lang.startsWith("yo") || lang.startsWith("ig")) {
        setIsAfrican(true);
      }
    } catch { /* non-critical */ }
  }, []);

  const authParam = useMemo(() => searchParams.get("auth"), [searchParams]);

  useEffect(() => {
    if (!mounted || isAuthenticated) return;
    if (authParam === "login" || authParam === "register") {
      setAuthInitialTab(authParam as "login" | "register");
      setAuthModalOpen(true);
    }
  }, [authParam, isAuthenticated, mounted]);

  const openRegister = useCallback(() => {
    if (isAuthenticated) { router.push("/dashboard"); return; }
    setAuthInitialTab("register");
    setAuthModalOpen(true);
  }, [isAuthenticated, router]);

  const openLogin = useCallback(() => {
    setAuthInitialTab("login");
    setAuthModalOpen(true);
  }, []);

  const handleCheckout = useCallback(async (plan: PlanKey) => {
    if (!isAuthenticated) { openRegister(); return; }
    setCheckoutError(null);
    setCheckoutState((prev) => ({ ...prev, [plan]: "loading" }));
    try {
      const res = await fetch(`${API_BASE}/api/billing/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          plan,
          success_url: `${window.location.origin}/dashboard?checkout=success`,
          cancel_url: `${window.location.origin}/pricing?checkout=cancelled`,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string })?.detail ?? `Server error ${res.status}`);
      }
      const data = await res.json() as { url?: string };
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setCheckoutError(message);
      setCheckoutState((prev) => ({ ...prev, [plan]: "error" }));
    }
  }, [isAuthenticated, openRegister]);

  const proPrice        = billingCycle === "monthly" ? "$9.99"  : "$5.00";
  const proNote         = billingCycle === "annual"  ? "Billed $59.99/year"  : "Billed monthly";
  const elitePrice      = billingCycle === "monthly" ? "$24.99" : "$12.50";
  const eliteNote       = billingCycle === "annual"  ? "Billed $149.99/year" : "Billed monthly";
  const proActivePlan: PlanKey   = billingCycle === "annual" ? "pro_annual"   : "pro_monthly";
  const eliteActivePlan: PlanKey = billingCycle === "annual" ? "elite_annual" : "elite_monthly";

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: "#070714" }}>
      {/* Ambient bg */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(17,212,115,0.08), transparent), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(17,212,115,0.04), transparent)" }} aria-hidden="true" />
      <div className="fixed inset-0 pointer-events-none z-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle, rgba(17,212,115,0.08) 1px, transparent 1px)", backgroundSize: "40px 40px" }} aria-hidden="true" />

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-xl" style={{ background: "rgba(7,7,20,0.85)" }}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 md:px-8 py-4">
          <Link href="/landing" className="flex items-center gap-3 no-underline">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm" style={{ background: "linear-gradient(135deg, #11d473, #0fa866)", color: "#fff" }}>
              T<span style={{ opacity: 0.6 }}>0</span>
            </div>
            <span className="text-base font-bold tracking-tight text-white hidden sm:inline">Terminal Zero</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/landing" className="text-sm font-medium no-underline hover:text-white/90 transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}>Home</Link>
            <Link href="/pricing" className="text-sm font-medium no-underline" style={{ color: "#11d473" }}>Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            {mounted && isAuthenticated ? (
              <button onClick={() => router.push("/dashboard")} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all" style={{ background: "linear-gradient(135deg, #11d473, #0fa866)", boxShadow: "0 2px 16px rgba(17,212,115,0.3)" }}>
                Dashboard
              </button>
            ) : (
              <>
                <button onClick={openLogin} className="px-4 py-2 rounded-lg text-sm font-medium border border-white/10 hover:border-white/20 transition-colors" style={{ color: "rgba(255,255,255,0.6)" }}>Sign In</button>
                <button onClick={openRegister} className="px-4 py-2 rounded-lg text-sm font-bold text-white transition-all" style={{ background: "linear-gradient(135deg, #11d473, #0fa866)", boxShadow: "0 2px 16px rgba(17,212,115,0.3)" }}>Start Free</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative z-10 pt-36 pb-6 px-6 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6" style={{ background: "rgba(17,212,115,0.06)", border: "1px solid rgba(17,212,115,0.25)", color: "#11d473" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#11d473" }} />
            Simple, transparent pricing
          </div>
          <h1 className="text-5xl lg:text-[56px] font-extrabold leading-[1.08] tracking-tight mb-5 text-white">
            Level up your{" "}
            <span style={{ background: "linear-gradient(135deg, #11d473, #11d473)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>trading edge</span>
          </h1>
          <p className="text-lg leading-relaxed max-w-lg mx-auto" style={{ color: "rgba(255,255,255,0.5)" }}>
            Start free, upgrade when you are ready. All plans include paper trading with real market data from Bybit.
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-7 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            {["14-day free trial", "Cancel anytime", "No credit card for trial"].map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <CheckIcon className="w-4 h-4" style={{ color: "#11d473" }} />{s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* BILLING TOGGLE */}
      <section className="relative z-10 flex justify-center px-6 mb-14 mt-8">
        <div className="inline-flex items-center gap-1 p-1 rounded-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={() => setBillingCycle("monthly")} className="px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200" style={billingCycle === "monthly" ? { background: "linear-gradient(135deg, #11d473, #0fa866)", color: "#fff", boxShadow: "0 2px 12px rgba(17,212,115,0.35)" } : { color: "rgba(255,255,255,0.5)" }}>Monthly</button>
          <button onClick={() => setBillingCycle("annual")} className="px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2" style={billingCycle === "annual" ? { background: "linear-gradient(135deg, #11d473, #0fa866)", color: "#fff", boxShadow: "0 2px 12px rgba(17,212,115,0.35)" } : { color: "rgba(255,255,255,0.5)" }}>
            Annual
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.2)" }}>Save 50%</span>
          </button>
        </div>
      </section>

      {/* PRICING CARDS */}
      <section className="relative z-10 max-w-[1200px] mx-auto px-6 pb-24">
        {checkoutError && (
          <div className="mb-8 px-5 py-4 rounded-xl text-sm flex items-start gap-3" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }} role="alert">
            <XIcon className="w-4 h-4 mt-0.5 shrink-0" />
            <span><strong style={{ color: "#fca5a5" }}>Checkout failed: </strong>{checkoutError}</span>
            <button onClick={() => setCheckoutError(null)} className="ml-auto shrink-0 opacity-60 hover:opacity-100 transition-opacity" aria-label="Dismiss error"><XIcon className="w-4 h-4" /></button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <PricingCard
            tier="FREE" icon={<FreeIcon />} subtitle="No credit card required"
            price="$0" period="" billingNote="Free forever"
            features={FREE_FEATURES} ctaLabel="Get Started Free" ctaStyle="outline"
            onCta={openRegister} ctaLoading={false}
            isAuthenticated={mounted && isAuthenticated} dashboardHref="/dashboard"
          />
          <PricingCard
            tier="PRO" icon={<ProIcon />} subtitle="Most popular"
            price={proPrice} period="/mo" billingNote={proNote}
            features={PRO_FEATURES} ctaLabel="Start 14-day Free Trial" ctaStyle="primary"
            onCta={() => handleCheckout(proActivePlan)} ctaLoading={checkoutState[proActivePlan] === "loading"}
            isPopular isAuthenticated={mounted && isAuthenticated} dashboardHref="/dashboard"
          />
          <PricingCard
            tier="ELITE" icon={<EliteIcon />} subtitle="For serious traders"
            price={elitePrice} period="/mo" billingNote={eliteNote}
            features={ELITE_FEATURES} ctaLabel="Get Elite" ctaStyle="secondary"
            onCta={() => handleCheckout(eliteActivePlan)} ctaLoading={checkoutState[eliteActivePlan] === "loading"}
            isAuthenticated={mounted && isAuthenticated} dashboardHref="/dashboard"
          />
        </div>

        {billingCycle === "monthly" && (
          <p className="text-center mt-6 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            Switch to{" "}
            <button onClick={() => setBillingCycle("annual")} className="underline underline-offset-2" style={{ color: "#11d473" }}>annual billing</button>
            {" "}to save 50% — Pro at $59.99/yr, Elite at $149.99/yr.
          </p>
        )}
      </section>

      {/* NGN PRICING */}
      {mounted && isAfrican && (
        <section className="relative z-10 max-w-[1200px] mx-auto px-6 pb-20">
          <NgnPricingPanel billingCycle={billingCycle} onCta={openRegister} />
        </section>
      )}

      {/* FEATURE COMPARISON */}
      <section className="relative z-10 max-w-[1000px] mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest mb-5" style={{ background: "rgba(17,212,115,0.06)", color: "#11d473", border: "1px solid rgba(17,212,115,0.18)" }}>Compare Plans</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Everything side by side</h2>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="grid grid-cols-4 px-6 py-4" style={{ background: "rgba(0,0,0,0.3)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Feature</div>
            <div className="text-sm font-semibold text-center" style={{ color: "rgba(255,255,255,0.5)" }}>Free</div>
            <div className="text-sm font-semibold text-center" style={{ color: "#11d473" }}>Pro</div>
            <div className="text-sm font-semibold text-center" style={{ color: "rgba(255,255,255,0.7)" }}>Elite</div>
          </div>
          {COMPARISON_FEATURES.map((row, i) => (
            <div key={row.name} className="grid grid-cols-4 px-6 py-3.5" style={{ borderBottom: i !== COMPARISON_FEATURES.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: i % 2 === 1 ? "rgba(255,255,255,0.01)" : "transparent" }}>
              <div className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>{row.name}</div>
              <div className="flex justify-center items-center"><ComparisonCell value={row.free} /></div>
              <div className="flex justify-center items-center"><ComparisonCell value={row.pro} /></div>
              <div className="flex justify-center items-center"><ComparisonCell value={row.elite} /></div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 max-w-[720px] mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest mb-5" style={{ background: "rgba(17,212,115,0.06)", color: "#11d473", border: "1px solid rgba(17,212,115,0.18)" }}>FAQ</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Common questions</h2>
        </div>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="rounded-xl transition-all duration-200" style={{ border: openFaq === i ? "1px solid rgba(17,212,115,0.25)" : "1px solid rgba(255,255,255,0.06)", background: openFaq === i ? "rgba(17,212,115,0.03)" : "rgba(255,255,255,0.02)" }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-6 py-4 text-left gap-4">
                <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>{item.q}</span>
                <svg className={`w-5 h-5 shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor" style={{ color: "rgba(255,255,255,0.3)" }}>
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5">
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="relative z-10 px-6 pb-24">
        <div className="max-w-[680px] mx-auto text-center px-8 py-16 rounded-3xl" style={{ background: "linear-gradient(135deg, rgba(17,212,115,0.06) 0%, rgba(17,212,115,0.03) 100%)", border: "1px solid rgba(17,212,115,0.18)" }}>
          <h2 className="text-3xl font-extrabold text-white mb-3 tracking-tight">Start trading smarter today</h2>
          <p className="text-lg mb-8" style={{ color: "rgba(255,255,255,0.45)" }}>Join thousands of traders honing their skills on Terminal Zero.</p>
          <button onClick={openRegister} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-base transition-all duration-200 hover:scale-[1.02]" style={{ background: "linear-gradient(135deg, #11d473, #0fa866)", boxShadow: "0 4px 24px rgba(17,212,115,0.4)" }}>
            Create Free Account
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4.167 10h11.666M10 4.167L15.833 10 10 15.833" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <p className="mt-4 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No credit card required for the free plan or 14-day trial</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 py-10 px-6 md:px-8" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm" style={{ background: "linear-gradient(135deg, #11d473, #0fa866)", color: "#fff" }}>T<span style={{ opacity: 0.6 }}>0</span></div>
            <span className="font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>Terminal Zero</span>
          </div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>Trading simulator for educational purposes. No real funds involved.</p>
          <div className="flex gap-6">
            <Link href="/legal/terms" className="text-xs no-underline hover:opacity-80 transition-opacity" style={{ color: "rgba(255,255,255,0.35)" }}>Terms</Link>
            <Link href="/legal/privacy" className="text-xs no-underline hover:opacity-80 transition-opacity" style={{ color: "rgba(255,255,255,0.35)" }}>Privacy</Link>
            <Link href="/legal/disclaimer" className="text-xs no-underline hover:opacity-80 transition-opacity" style={{ color: "rgba(255,255,255,0.35)" }}>Disclaimer</Link>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialTab={authInitialTab} />
    </div>
  );
}

/* ── Pricing Card ── */

interface PricingCardProps {
  tier: string;
  icon: React.ReactNode;
  subtitle: string;
  price: string;
  period: string;
  billingNote: string;
  features: string[];
  ctaLabel: string;
  ctaStyle: "primary" | "secondary" | "outline";
  onCta: () => void;
  ctaLoading: boolean;
  isPopular?: boolean;
  isAuthenticated: boolean;
  dashboardHref: string;
}

function PricingCard({ tier, icon, subtitle, price, period, billingNote, features, ctaLabel, ctaStyle, onCta, ctaLoading, isPopular, isAuthenticated, dashboardHref }: PricingCardProps) {
  const cardStyle: React.CSSProperties = isPopular
    ? { background: "rgba(17,212,115,0.04)", border: "1px solid rgba(17,212,115,0.3)", position: "relative" }
    : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", position: "relative" };

  const ctaBtnStyle: React.CSSProperties =
    ctaStyle === "primary"
      ? { background: "linear-gradient(135deg, #11d473, #0fa866)", color: "#fff", boxShadow: "0 4px 20px rgba(17,212,115,0.4)" }
      : ctaStyle === "secondary"
      ? { background: "rgba(255,255,255,0.06)", color: "#e0e7ff", border: "1px solid rgba(255,255,255,0.12)" }
      : { background: "transparent", color: "#11d473", border: "1px solid rgba(17,212,115,0.3)" };

  return (
    <div className="rounded-2xl p-8 flex flex-col relative overflow-hidden" style={cardStyle}>
      {isPopular && (
        <div className="absolute top-0 left-0 right-0 flex justify-center" style={{ zIndex: 2 }}>
          <div className="px-4 py-1 rounded-b-full text-[11px] font-bold uppercase tracking-widest" style={{ background: "linear-gradient(135deg, #11d473, #0fa866)", color: "#fff", boxShadow: "0 4px 16px rgba(17,212,115,0.35)" }}>
            Most Popular
          </div>
        </div>
      )}
      <div className={`flex items-center gap-3 ${isPopular ? "mt-5" : ""} mb-6`}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(17,212,115,0.08)", border: "1px solid rgba(17,212,115,0.18)", color: "#11d473" }}>{icon}</div>
        <div>
          <h3 className="text-base font-bold text-white">{tier}</h3>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{subtitle}</p>
        </div>
      </div>
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-5xl font-extrabold text-white tracking-tight">{price}</span>
          {period && <span className="text-lg font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>{period}</span>}
        </div>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{billingNote}</p>
      </div>
      <ul className="flex-1 space-y-3 mb-8">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
            <CheckIcon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#11d473" }} />{f}
          </li>
        ))}
      </ul>
      {isAuthenticated ? (
        <Link href={dashboardHref} className="w-full py-3.5 rounded-xl text-sm font-bold text-center no-underline block transition-all duration-200 hover:scale-[1.01]" style={ctaBtnStyle}>
          Go to Dashboard
        </Link>
      ) : (
        <button onClick={onCta} disabled={ctaLoading} className="w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-200 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2" style={ctaBtnStyle}>
          {ctaLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4" strokeDashoffset="10" />
              </svg>
              Redirecting...
            </>
          ) : ctaLabel}
        </button>
      )}
    </div>
  );
}

/* ── NGN Pricing Panel ── */

function NgnPricingPanel({ billingCycle, onCta }: { billingCycle: BillingCycle; onCta: () => void }) {
  const GREEN = "#00B14F";
  const allCards = [
    { label: "Pro Monthly",   ngn: "₦15,000",  sub: "/month",           plan: "pro_monthly" },
    { label: "Pro Annual",    ngn: "₦90,000",  sub: "/year (save 50%)", plan: "pro_annual" },
    { label: "Elite Monthly", ngn: "₦35,000",  sub: "/month",           plan: "elite_monthly" },
    { label: "Elite Annual",  ngn: "₦210,000", sub: "/year (save 50%)", plan: "elite_annual" },
  ];
  const cards = allCards.filter((c) =>
    billingCycle === "monthly" ? c.plan.endsWith("monthly") : c.plan.endsWith("annual")
  );

  return (
    <div className="rounded-2xl p-8" style={{ background: "rgba(0,177,79,0.03)", border: "1px solid rgba(0,177,79,0.15)" }}>
      <div className="text-center mb-8">
        <span className="inline-block px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest mb-4" style={{ background: "rgba(0,177,79,0.08)", color: GREEN, border: "1px solid rgba(0,177,79,0.18)" }}>Pay in Naira</span>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Local Pricing via Paystack</h2>
        <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>Pay with card, bank transfer, USSD, or mobile money in Nigerian Naira</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => (
          <div key={card.plan} className="rounded-xl p-5 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: GREEN }}>{card.label}</p>
            <p className="font-mono text-3xl font-extrabold text-white">{card.ngn}</p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{card.sub}</p>
            <button onClick={onCta} className="w-full mt-4 py-2.5 rounded-lg text-sm font-semibold transition-colors" style={{ background: "rgba(0,177,79,0.1)", border: "1px solid rgba(0,177,79,0.2)", color: GREEN }}>
              Pay with Paystack
            </button>
          </div>
        ))}
      </div>
      <p className="text-center mt-5 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
        Naira prices are approximate and may be updated periodically to reflect exchange rates.
      </p>
    </div>
  );
}

/* ── Tier Icons ── */

function FreeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function ProIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function EliteIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  );
}
