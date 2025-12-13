"use client";

import AuthModal from "@/components/AuthModal";
import Navbar from "@/components/layout/Navbar";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

function PricingPageInner() {
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<"login" | "register">("register");

  const authParam = useMemo(() => searchParams.get("auth"), [searchParams]);

  useEffect(() => {
    if (isAuthenticated) return;
    if (authParam === "login" || authParam === "register") {
      setAuthInitialTab(authParam);
      setAuthModalOpen(true);
    }
  }, [authParam, isAuthenticated]);

  return (
    <div className="pricing-page">
      <Navbar />

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialTab={authInitialTab} />

      <main className="pricing-content">
        <header className="pricing-header">
          <h1>Pricing</h1>
          <p>Choose a plan that matches your trading goals.</p>
        </header>

        <div className="plans">
          <div className="plan-card">
            <div className="plan-top">
              <h2>Free</h2>
              <div className="price">$0</div>
              <div className="price-sub">Always free</div>
            </div>
            <ul className="plan-features">
              <li>Live market streaming</li>
              <li>Paper trading</li>
              <li>Dashboard + journal</li>
            </ul>
            {!isAuthenticated ? (
              <Link className="plan-cta" href="/pricing?auth=register">
                Start Free
              </Link>
            ) : (
              <Link className="plan-cta" href="/dashboard">
                Go to Dashboard
              </Link>
            )}
          </div>

          <div className="plan-card featured">
            <div className="plan-top">
              <div className="badge">Most Popular</div>
              <h2>Pro</h2>
              <div className="price">$29</div>
              <div className="price-sub">Per month</div>
            </div>
            <ul className="plan-features">
              <li>Higher leverage options</li>
              <li>Advanced analytics</li>
              <li>Priority access</li>
            </ul>
            {!isAuthenticated ? (
              <Link className="plan-cta" href="/pricing?auth=register">
                Create Account
              </Link>
            ) : (
              <Link className="plan-cta" href="/dashboard">
                Upgrade in Dashboard
              </Link>
            )}
          </div>

          <div className="plan-card">
            <div className="plan-top">
              <h2>Prop Challenge</h2>
              <div className="price">$99</div>
              <div className="price-sub">One-time</div>
            </div>
            <ul className="plan-features">
              <li>Access to Prop Challenge</li>
              <li>Evaluation dashboard</li>
              <li>Performance objectives</li>
            </ul>
            {!isAuthenticated ? (
              <Link className="plan-cta" href="/pricing?auth=register">
                Get Started
              </Link>
            ) : (
              <Link className="plan-cta" href="/challenge">
                Open Challenge
              </Link>
            )}
          </div>
        </div>

        <div className="pricing-footer">
          <p>
            Already have an account? <Link href="/pricing?auth=login">Sign in</Link>
          </p>
        </div>
      </main>

      <style jsx>{`
        .pricing-page {
          min-height: 100vh;
          background: var(--bg);
        }

        .pricing-content {
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 20px 80px;
        }

        .pricing-header {
          text-align: center;
          margin-bottom: 34px;
        }

        .pricing-header h1 {
          margin: 0;
          font-size: 34px;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.5px;
        }

        .pricing-header p {
          margin: 10px 0 0;
          color: var(--text-muted);
          font-size: 14px;
        }

        .plans {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .plan-card {
          background: var(--surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          padding: 18px;
          display: flex;
          flex-direction: column;
          min-height: 360px;
        }

        .plan-card.featured {
          border-color: rgba(0, 230, 160, 0.25);
          box-shadow: 0 0 0 1px rgba(0, 230, 160, 0.08);
        }

        .plan-top {
          margin-bottom: 14px;
        }

        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          background: var(--profit-glow);
          color: var(--mint-400);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          border: 1px solid rgba(0, 230, 160, 0.2);
          margin-bottom: 10px;
        }

        .plan-top h2 {
          margin: 0 0 8px;
          font-size: 18px;
          font-weight: 800;
          color: var(--text-primary);
        }

        .price {
          font-family: var(--font-display);
          font-size: 34px;
          font-weight: 900;
          color: var(--text-primary);
          letter-spacing: -1px;
        }

        .price-sub {
          margin-top: 4px;
          color: var(--text-muted);
          font-size: 12px;
        }

        .plan-features {
          margin: 0;
          padding: 0 0 0 16px;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.6;
          flex: 1;
        }

        .plan-cta {
          margin-top: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 42px;
          border-radius: var(--radius-md);
          background: var(--depth);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          text-decoration: none;
          font-weight: 700;
          font-size: 13px;
          transition: all var(--transition-fast);
        }

        .plan-cta:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .featured .plan-cta {
          background: linear-gradient(135deg, var(--mint-500), var(--mint-600));
          border-color: rgba(0, 230, 160, 0.3);
          color: var(--void);
        }

        .pricing-footer {
          margin-top: 26px;
          text-align: center;
          color: var(--text-muted);
          font-size: 13px;
        }

        .pricing-footer a {
          color: var(--mint-400);
          text-decoration: none;
          font-weight: 700;
        }

        @media (max-width: 980px) {
          .plans {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
