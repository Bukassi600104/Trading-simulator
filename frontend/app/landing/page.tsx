"use client";

import AuthModal from "@/components/AuthModal";
import { useAuthStore } from "@/stores/authStore";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<"login" | "register">("register");
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Allow deep-linking into auth modal from protected pages
  useEffect(() => {
    if (!mounted) return;
    if (isAuthenticated) return;

    const auth = searchParams.get("auth");
    if (auth === "login" || auth === "register") {
      setAuthInitialTab(auth);
      setAuthModalOpen(true);
    }
  }, [mounted, isAuthenticated, searchParams]);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      setAuthInitialTab("register");
      setAuthModalOpen(true);
    }
  };

  const handleSignIn = () => {
    setAuthInitialTab("login");
    setAuthModalOpen(true);
  };

  return (
    <div className="landing">
      {/* Ambient Background Effects */}
      <div className="ambient-glow" />
      <div className="grid-overlay" />

      {/* Navigation */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="logo-group">
            <div className="logo-mark">
              <span>T</span>
              <span className="logo-zero">0</span>
            </div>
            <span className="logo-name">Terminal Zero</span>
          </div>

          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#process">How It Works</a>
            <a href="/pricing">Pricing</a>
          </div>

          <div className="nav-actions">
            {mounted && isAuthenticated ? (
              <button className="btn-dashboard" onClick={() => router.push("/dashboard")}> 
                Dashboard
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ) : (
              <>
                <button className="btn-signin" onClick={handleSignIn}>
                  Sign In
                </button>
                <button className="btn-cta" onClick={handleGetStarted}>
                  Start Free
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content animate-slide-up">
          <div className="hero-badge">
            <span className="badge-dot" />
            Live Market Data • Zero Risk
          </div>

          <h1>
            <span className="hero-line">Ground Zero for</span>
            <span className="hero-line gradient">Professional Trading</span>
          </h1>

          <p className="hero-desc">
            Master crypto trading with real market conditions and $10,000 in simulated funds. 
            Perfect for prop firm training, strategy testing, and skill development.
          </p>

          <div className="hero-cta-group">
            <button className="btn-primary-lg" onClick={handleGetStarted}>
              <span>Start Trading Free</span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4.167 10h11.666M10 4.167L15.833 10 10 15.833" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="hero-note">No credit card required</span>
          </div>

          <div className="hero-metrics">
            <div className="metric">
              <span className="metric-value">$10K</span>
              <span className="metric-label">Starting Capital</span>
            </div>
            <div className="metric-divider" />
            <div className="metric">
              <span className="metric-value">0ms</span>
              <span className="metric-label">Latency</span>
            </div>
            <div className="metric-divider" />
            <div className="metric">
              <span className="metric-value">24/7</span>
              <span className="metric-label">Market Access</span>
            </div>
          </div>
        </div>

        {/* Terminal Preview */}
        <div className="terminal-preview animate-slide-up delay-200">
          <div className="terminal-chrome">
            <div className="chrome-dots">
              <span className="dot red" />
              <span className="dot yellow" />
              <span className="dot green" />
            </div>
            <span className="chrome-title">T0 — BTC-USDT</span>
            <div className="chrome-status">
              <span className="status-live" />
              LIVE
            </div>
          </div>

          <div className="terminal-body">
            {/* Price Header */}
            <div className="price-header">
              <div className="price-main">
                <span className="symbol">BTC</span>
                <span className="price-value">98,245.50</span>
                <span className="price-change profit">+2.45%</span>
              </div>
              <div className="price-stats">
                <div className="stat-item">
                  <span className="stat-label">24h High</span>
                  <span className="stat-value">99,120.00</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">24h Low</span>
                  <span className="stat-value">95,880.00</span>
                </div>
              </div>
            </div>

            {/* Candlestick Visualization */}
            <div className="chart-area">
              <div className="candles">
                {[68, 45, 72, 82, 55, 78, 90, 62, 85, 48, 75, 88, 52, 70, 95, 60, 80, 42, 76, 85].map((h, i) => (
                  <div key={i} className={`candle ${i % 3 === 1 ? 'bear' : 'bull'}`} style={{height: `${h}%`}} />
                ))}
              </div>
              <div className="chart-grid" />
            </div>

            {/* Position Card */}
            <div className="position-card">
              <div className="position-header">
                <span className="position-label">Open Position</span>
                <span className="position-type long">LONG</span>
              </div>
              <div className="position-details">
                <div className="detail">
                  <span>Entry</span>
                  <span className="mono">97,120.00</span>
                </div>
                <div className="detail">
                  <span>Size</span>
                  <span className="mono">0.15 BTC</span>
                </div>
                <div className="detail pnl">
                  <span>P&L</span>
                  <span className="profit mono">+$168.82</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="section-header">
          <span className="section-tag">Features</span>
          <h2>Built for Serious Traders</h2>
          <p>Everything you need to develop, test, and refine your trading strategy.</p>
        </div>

        <div className="features-grid">
          {[
            {
              icon: "⚡",
              title: "Real-Time Data",
              desc: "Live price feeds from Bybit exchange with sub-second updates."
            },
            {
              icon: "🎯",
              title: "Prop Firm Mode",
              desc: "Practice with FTMO-style rules: drawdown limits, profit targets, consistency."
            },
            {
              icon: "📊",
              title: "Auto Journal",
              desc: "Every trade logged automatically with charts, notes, and analytics."
            },
            {
              icon: "⏪",
              title: "Bar Replay",
              desc: "Practice on historical data. Perfect your entries on past market moves."
            },
            {
              icon: "🔧",
              title: "Risk Calculator",
              desc: "Position sizing based on your risk tolerance. Never blow up again."
            },
            {
              icon: "🏆",
              title: "Leaderboards",
              desc: "Compete with other traders. Track your progress on clan rankings."
            }
          ].map((feature, i) => (
            <div key={i} className="feature-card animate-slide-up" style={{animationDelay: `${i * 100}ms`}}>
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="process">
        <div className="section-header">
          <span className="section-tag">How It Works</span>
          <h2>From Zero to Trading in 60 Seconds</h2>
        </div>

        <div className="process-steps">
          {[
            { num: "01", title: "Create Account", desc: "Quick signup with email or Google. Completely free." },
            { num: "02", title: "Get Funded", desc: "$10,000 in simulated capital loaded instantly." },
            { num: "03", title: "Start Trading", desc: "Execute trades on live markets. Zero risk." }
          ].map((step, i) => (
            <div key={i} className="step-card animate-slide-up" style={{animationDelay: `${i * 150}ms`}}>
              <span className="step-num">{step.num}</span>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-box">
          <h2>Ready to Level Up Your Trading?</h2>
          <p>Join thousands of traders practicing risk-free every day.</p>
          <button className="btn-primary-lg" onClick={handleGetStarted}>
            <span>Start Trading Now</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4.167 10h11.666M10 4.167L15.833 10 10 15.833" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="logo-mark small">
              <span>T</span>
              <span className="logo-zero">0</span>
            </div>
            <span>Terminal Zero</span>
          </div>
          <p className="disclaimer">
            Trading simulator for educational purposes. No real funds involved.
          </p>
          <div className="footer-links">
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authInitialTab}
      />

      <style jsx>{`
        /* ═══════════════════════════════════════════════════════════════
           LANDING PAGE STYLES - Terminal Zero
           ═══════════════════════════════════════════════════════════════ */
        
        .landing {
          min-height: 100vh;
          background: var(--void);
          position: relative;
          overflow-x: hidden;
        }

        /* Ambient Effects */
        .ambient-glow {
          position: fixed;
          top: -50%;
          left: 50%;
          transform: translateX(-50%);
          width: 150%;
          height: 100%;
          background: radial-gradient(ellipse 50% 30% at 50% 0%, rgba(0, 230, 160, 0.08), transparent);
          pointer-events: none;
          z-index: 0;
        }

        .grid-overlay {
          position: fixed;
          inset: 0;
          background-image: 
            linear-gradient(rgba(148, 163, 184, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
          z-index: 0;
        }

        /* ═══════════════════════════════════════════════════════════════
           NAVIGATION
           ═══════════════════════════════════════════════════════════════ */
        .nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          padding: 16px 32px;
          background: rgba(5, 8, 15, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-subtle);
        }

        .nav-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo-group {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .logo-mark {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, var(--mint-500), var(--mint-600));
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-weight: 700;
          font-size: 18px;
          color: var(--void);
          gap: 1px;
        }

        .logo-mark.small {
          width: 32px;
          height: 32px;
          font-size: 14px;
          border-radius: 8px;
        }

        .logo-zero {
          color: var(--void);
          opacity: 0.7;
        }

        .logo-name {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.5px;
        }

        .nav-links {
          display: flex;
          gap: 40px;
        }

        .nav-links a {
          color: var(--text-muted);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: color var(--transition-fast);
        }

        .nav-links a:hover {
          color: var(--mint-400);
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-signin {
          padding: 10px 20px;
          background: transparent;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .btn-signin:hover {
          border-color: var(--mint-500);
          color: var(--mint-400);
        }

        .btn-cta, .btn-dashboard {
          padding: 10px 20px;
          background: linear-gradient(135deg, var(--mint-500), var(--mint-600));
          border: none;
          border-radius: var(--radius-md);
          color: var(--void);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-cta:hover, .btn-dashboard:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0, 230, 160, 0.3);
        }

        /* ═══════════════════════════════════════════════════════════════
           HERO SECTION
           ═══════════════════════════════════════════════════════════════ */
        .hero {
          min-height: 100vh;
          max-width: 1400px;
          margin: 0 auto;
          padding: 140px 32px 80px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .hero-content {
          max-width: 560px;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          background: rgba(0, 230, 160, 0.08);
          border: 1px solid rgba(0, 230, 160, 0.2);
          border-radius: var(--radius-full);
          font-size: 13px;
          font-weight: 500;
          color: var(--mint-400);
          margin-bottom: 28px;
        }

        .badge-dot {
          width: 8px;
          height: 8px;
          background: var(--mint-500);
          border-radius: 50%;
          animation: pulse-glow 2s infinite;
        }

        .hero h1 {
          font-size: 60px;
          font-weight: 800;
          line-height: 1.05;
          letter-spacing: -2px;
          margin-bottom: 24px;
        }

        .hero-line {
          display: block;
          color: var(--text-primary);
        }

        .hero-line.gradient {
          background: linear-gradient(135deg, var(--mint-400), var(--mint-200));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-desc {
          font-size: 18px;
          line-height: 1.7;
          color: var(--text-secondary);
          margin-bottom: 36px;
        }

        .hero-cta-group {
          margin-bottom: 48px;
        }

        .btn-primary-lg {
          padding: 18px 32px;
          background: linear-gradient(135deg, var(--mint-500), var(--mint-600));
          border: none;
          border-radius: var(--radius-lg);
          color: var(--void);
          font-size: 17px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          transition: all var(--transition-base);
        }

        .btn-primary-lg:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 32px rgba(0, 230, 160, 0.4);
        }

        .btn-primary-lg svg {
          transition: transform var(--transition-fast);
        }

        .btn-primary-lg:hover svg {
          transform: translateX(4px);
        }

        .hero-note {
          display: block;
          margin-top: 14px;
          font-size: 14px;
          color: var(--text-ghost);
        }

        .hero-metrics {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .metric {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .metric-value {
          font-family: var(--font-mono);
          font-size: 28px;
          font-weight: 700;
          color: var(--mint-400);
        }

        .metric-label {
          font-size: 13px;
          color: var(--text-muted);
        }

        .metric-divider {
          width: 1px;
          height: 40px;
          background: var(--border-default);
        }

        /* ═══════════════════════════════════════════════════════════════
           TERMINAL PREVIEW
           ═══════════════════════════════════════════════════════════════ */
        .terminal-preview {
          background: var(--surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: 
            0 0 0 1px rgba(0, 230, 160, 0.05),
            0 20px 60px rgba(0, 0, 0, 0.5),
            0 0 100px rgba(0, 230, 160, 0.05);
        }

        .terminal-chrome {
          display: flex;
          align-items: center;
          padding: 14px 18px;
          background: var(--depth);
          border-bottom: 1px solid var(--border-subtle);
        }

        .chrome-dots {
          display: flex;
          gap: 8px;
        }

        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .dot.red { background: #ff5f57; }
        .dot.yellow { background: #febc2e; }
        .dot.green { background: #28c840; }

        .chrome-title {
          flex: 1;
          text-align: center;
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--text-muted);
        }

        .chrome-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          color: var(--mint-400);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-live {
          width: 6px;
          height: 6px;
          background: var(--mint-500);
          border-radius: 50%;
          animation: pulse-glow 1.5s infinite;
        }

        .terminal-body {
          padding: 20px;
        }

        .price-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .price-main {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }

        .symbol {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .price-value {
          font-family: var(--font-mono);
          font-size: 32px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .price-change {
          font-family: var(--font-mono);
          font-size: 14px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: var(--radius-sm);
        }

        .price-change.profit {
          background: var(--profit-glow);
          color: var(--profit-400);
        }

        .price-stats {
          display: flex;
          gap: 20px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .stat-item .stat-label {
          font-size: 11px;
          color: var(--text-ghost);
        }

        .stat-item .stat-value {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--text-secondary);
        }

        /* Chart Area */
        .chart-area {
          position: relative;
          height: 180px;
          margin-bottom: 16px;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: var(--abyss);
        }

        .candles {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 100%;
          display: flex;
          align-items: flex-end;
          gap: 4px;
          padding: 16px;
        }

        .candle {
          flex: 1;
          border-radius: 2px;
          min-width: 6px;
          transition: height 0.3s ease;
        }

        .candle.bull {
          background: linear-gradient(180deg, var(--profit-400), var(--profit-600));
        }

        .candle.bear {
          background: linear-gradient(180deg, var(--loss-400), var(--loss-600));
        }

        .chart-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px);
          background-size: 30px 30px;
          pointer-events: none;
        }

        /* Position Card */
        .position-card {
          background: var(--depth);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 14px;
        }

        .position-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .position-label {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .position-type {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .position-type.long {
          background: var(--profit-glow);
          color: var(--profit-400);
        }

        .position-details {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .detail {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail span:first-child {
          font-size: 11px;
          color: var(--text-ghost);
        }

        .detail .mono {
          font-family: var(--font-mono);
          font-size: 14px;
          color: var(--text-primary);
        }

        .detail.pnl .profit {
          color: var(--profit-400);
        }

        /* ═══════════════════════════════════════════════════════════════
           FEATURES SECTION
           ═══════════════════════════════════════════════════════════════ */
        .features {
          max-width: 1200px;
          margin: 0 auto;
          padding: 120px 32px;
          position: relative;
          z-index: 1;
        }

        .section-header {
          text-align: center;
          max-width: 600px;
          margin: 0 auto 64px;
        }

        .section-tag {
          display: inline-block;
          padding: 6px 14px;
          background: rgba(0, 230, 160, 0.1);
          border-radius: var(--radius-full);
          font-size: 12px;
          font-weight: 600;
          color: var(--mint-400);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 20px;
        }

        .section-header h2 {
          font-size: 40px;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 16px;
          letter-spacing: -1px;
        }

        .section-header p {
          font-size: 18px;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .feature-card {
          background: var(--surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 28px;
          transition: all var(--transition-base);
        }

        .feature-card:hover {
          border-color: var(--border-default);
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
        }

        .feature-icon {
          font-size: 32px;
          margin-bottom: 16px;
        }

        .feature-card h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 10px;
        }

        .feature-card p {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        /* ═══════════════════════════════════════════════════════════════
           PROCESS SECTION
           ═══════════════════════════════════════════════════════════════ */
        .process {
          max-width: 1000px;
          margin: 0 auto;
          padding: 80px 32px 120px;
          position: relative;
          z-index: 1;
        }

        .process-steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
        }

        .step-card {
          text-align: center;
          padding: 32px;
        }

        .step-num {
          font-family: var(--font-mono);
          font-size: 48px;
          font-weight: 700;
          color: var(--mint-500);
          opacity: 0.3;
          margin-bottom: 20px;
          display: block;
        }

        .step-card h3 {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 12px;
        }

        .step-card p {
          font-size: 15px;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        /* ═══════════════════════════════════════════════════════════════
           CTA SECTION
           ═══════════════════════════════════════════════════════════════ */
        .cta-section {
          padding: 80px 32px;
          position: relative;
          z-index: 1;
        }

        .cta-box {
          max-width: 700px;
          margin: 0 auto;
          text-align: center;
          padding: 64px 48px;
          background: linear-gradient(135deg, rgba(0, 230, 160, 0.05), rgba(0, 230, 160, 0.02));
          border: 1px solid rgba(0, 230, 160, 0.15);
          border-radius: var(--radius-xl);
        }

        .cta-box h2 {
          font-size: 36px;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }

        .cta-box p {
          font-size: 18px;
          color: var(--text-secondary);
          margin-bottom: 32px;
        }

        /* ═══════════════════════════════════════════════════════════════
           FOOTER
           ═══════════════════════════════════════════════════════════════ */
        .footer {
          border-top: 1px solid var(--border-subtle);
          padding: 40px 32px;
          position: relative;
          z-index: 1;
        }

        .footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .footer-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .disclaimer {
          font-size: 13px;
          color: var(--text-ghost);
        }

        .footer-links {
          display: flex;
          gap: 24px;
        }

        .footer-links a {
          font-size: 13px;
          color: var(--text-muted);
          text-decoration: none;
          transition: color var(--transition-fast);
        }

        .footer-links a:hover {
          color: var(--mint-400);
        }

        /* ═══════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════ */
        @media (max-width: 1024px) {
          .hero {
            grid-template-columns: 1fr;
            gap: 60px;
            text-align: center;
          }

          .hero-content {
            max-width: 100%;
          }

          .hero-metrics {
            justify-content: center;
          }

          .terminal-preview {
            max-width: 500px;
            margin: 0 auto;
          }

          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .nav-links {
            display: none;
          }

          .hero h1 {
            font-size: 40px;
          }

          .features-grid,
          .process-steps {
            grid-template-columns: 1fr;
          }

          .footer-inner {
            flex-direction: column;
            gap: 20px;
            text-align: center;
          }
        }

        /* ═══════════════════════════════════════════════════════════════
           ANIMATIONS
           ═══════════════════════════════════════════════════════════════ */
        .animate-slide-up {
          opacity: 0;
          animation: slide-up 0.8s ease-out forwards;
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
