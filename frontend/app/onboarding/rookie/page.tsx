"use client";

import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

// Pre-generated confetti data to avoid hydration mismatch
const CONFETTI_COLORS = ['#00d4aa', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
const CONFETTI_DATA = Array.from({ length: 100 }, (_, i) => ({
  left: (i * 7 + 13) % 100,
  delay: (i * 0.02) % 2,
  color: CONFETTI_COLORS[i % 5],
}));

// Pre-generated candle data
const MOCK_CANDLES = [
  { color: 'green', height: 45 }, { color: 'red', height: 35 },
  { color: 'green', height: 55 }, { color: 'green', height: 48 },
  { color: 'red', height: 32 }, { color: 'green', height: 62 },
  { color: 'red', height: 38 }, { color: 'green', height: 52 },
  { color: 'green', height: 44 }, { color: 'red', height: 28 },
  { color: 'green', height: 58 }, { color: 'green', height: 50 },
  { color: 'red', height: 36 }, { color: 'green', height: 65 },
  { color: 'red', height: 40 }, { color: 'green', height: 72 },
  { color: 'green', height: 55 }, { color: 'red', height: 30 },
  { color: 'green', height: 68 }, { color: 'green', height: 60 },
  { color: 'red', height: 42 }, { color: 'green', height: 75 },
  { color: 'green', height: 58 }, { color: 'red', height: 34 },
  { color: 'green', height: 70 }, { color: 'green', height: 52 },
  { color: 'red', height: 38 }, { color: 'green', height: 64 },
  { color: 'green', height: 48 }, { color: 'red', height: 32 },
];

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  highlight: string; // CSS selector or area name
  action?: string; // Button text for required action
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: "Welcome to Your Trading Floor! 🎉",
    description: "We've loaded your account with $10,000 (Simulated). Let's make your first profit together!",
    highlight: "welcome",
  },
  {
    id: 2,
    title: "This is Bitcoin's Live Price",
    description: "The chart shows real-time price movement. Green candles = price going up, Red = going down.",
    highlight: "chart",
  },
  {
    id: 3,
    title: "Let's Open Your First Trade!",
    description: "We think Bitcoin is going up. Click the BUY button to open a position.",
    highlight: "buy-button",
    action: "BUY",
  },
  {
    id: 4,
    title: "Watch Your Profit! 💰",
    description: "This is your PnL (Profit & Loss). It moves in real-time with the market.",
    highlight: "pnl",
  },
  {
    id: 5,
    title: "You're In Profit! Close to Bank It!",
    description: "Great timing! Click CLOSE POSITION to secure your profit.",
    highlight: "close-button",
    action: "CLOSE",
  },
];

export default function RookieOnboarding() {
  const router = useRouter();
  const { checkAuth } = useAuthStore();
  const { experience, setTutorialStep, completeFirstTrade } = useOnboardingStore();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [mockPrice, setMockPrice] = useState(96750);
  const [mockPnL, setMockPnL] = useState(0);
  const [hasPosition, setHasPosition] = useState(false);
  const [entryPrice, setEntryPrice] = useState(0);
  const [badgeUnlocked, setBadgeUnlocked] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Show loading spinner until component is mounted
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const run = async () => {
      const ok = await checkAuth();
      if (!ok) {
        router.replace("/landing?auth=login");
        return;
      }
      setIsCheckingAuth(false);
    };
    run();
  }, [checkAuth, router]);

  // Only redirect if explicitly wrong experience (not null)
  useEffect(() => {
    if (experience !== null && experience !== 'beginner') {
      router.push("/onboarding");
    }
  }, [experience, router]);

  // Simulate price movement
  useEffect(() => {
    const interval = setInterval(() => {
      setMockPrice(prev => {
        // Slightly biased toward positive movement for first trade
        const change = (Math.random() - 0.45) * 20;
        return Math.max(prev + change, 96000);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update PnL when price changes
  useEffect(() => {
    if (hasPosition && entryPrice > 0) {
      const pnl = ((mockPrice - entryPrice) / entryPrice) * 1000; // Assuming $1000 position
      setMockPnL(pnl);
      
      // Progress to close step when in profit
      if (pnl > 5 && currentStep === 3) {
        setTimeout(() => setCurrentStep(4), 500);
      }
    }
  }, [mockPrice, hasPosition, entryPrice, currentStep]);

  const handleBuy = useCallback(() => {
    if (currentStep === 2 && !hasPosition) {
      setHasPosition(true);
      setEntryPrice(mockPrice);
      setCurrentStep(3);
    }
  }, [currentStep, hasPosition, mockPrice]);

  const handleClose = useCallback(() => {
    if (currentStep === 4 && hasPosition) {
      setHasPosition(false);
      setShowConfetti(true);
      setBadgeUnlocked(true);
      completeFirstTrade();
      
      // Redirect after celebration
      setTimeout(() => {
        router.push("/dashboard");
      }, 4000);
    }
  }, [currentStep, hasPosition, completeFirstTrade, router]);

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setTutorialStep(currentStep + 1);
    }
  };

  const step = tutorialSteps[currentStep];

  // Show loading spinner while page hydrates
  if (!isLoaded || isCheckingAuth) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0d14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #1e293b',
          borderTopColor: '#00d4aa',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#94a3b8', fontSize: '16px' }}>Preparing your tutorial...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="rookie-onboarding">
      {/* Confetti Celebration */}
      {showConfetti && (
        <div className="confetti-container">
          {CONFETTI_DATA.map((confetti, i) => (
            <div 
              key={i} 
              className="confetti"
              style={{
                left: `${confetti.left}%`,
                animationDelay: `${confetti.delay}s`,
                backgroundColor: confetti.color,
              }}
            />
          ))}
        </div>
      )}

      {/* Badge Unlock Modal */}
      {badgeUnlocked && (
        <div className="badge-modal">
          <div className="badge-content">
            <div className="badge-icon">🏆</div>
            <h2>Badge Unlocked!</h2>
            <div className="badge-name">"First Blood"</div>
            <p>You completed your first profitable trade!</p>
            <div className="profit-display">
              <span className="profit-label">Your Profit</span>
              <span className="profit-value">+${mockPnL.toFixed(2)}</span>
            </div>
            <p className="next-hint">
              Tip: Try using the <strong>Risk Calculator</strong> to protect your next trade!
            </p>
          </div>
        </div>
      )}

      {/* Dimmed Background */}
      <div className={`dim-overlay ${currentStep > 0 ? 'active' : ''}`} />

      {/* Mock Trading Interface */}
      <div className="trading-interface">
        {/* Header */}
        <div className="mock-header">
          <div className="logo">
            <span className="logo-icon">M</span>
            <span className="logo-text">Midnight Trader</span>
          </div>
          <div className="balance">
            <span className="balance-label">Simulated Balance</span>
            <span className="balance-value">${(10000 + mockPnL).toFixed(2)}</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Chart Area */}
          <div className={`chart-area ${step.highlight === 'chart' ? 'highlighted' : ''}`}>
            <div className="chart-header">
              <span className="symbol">BTC/USDT</span>
              <span className={`price ${mockPrice > 96750 ? 'positive' : 'negative'}`}>
                ${mockPrice.toFixed(2)}
              </span>
            </div>
            <div className="chart-body">
              <div className="mock-chart">
                {MOCK_CANDLES.map((candle, i) => (
                  <div 
                    key={i}
                    className={`mock-candle ${candle.color}`}
                    style={{ height: `${candle.height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Order Panel */}
          <div className="order-panel">
            {/* PnL Display */}
            {hasPosition && (
              <div className={`pnl-display ${step.highlight === 'pnl' ? 'highlighted' : ''} ${mockPnL >= 0 ? 'positive' : 'negative'}`}>
                <span className="pnl-label">Unrealized P&L</span>
                <span className="pnl-value">
                  {mockPnL >= 0 ? '+' : ''}${mockPnL.toFixed(2)}
                </span>
              </div>
            )}

            {/* Buy Button */}
            <button 
              className={`buy-btn ${step.highlight === 'buy-button' ? 'highlighted pulse' : ''}`}
              onClick={handleBuy}
              disabled={hasPosition}
            >
              BUY / LONG
            </button>

            {/* Close Button */}
            {hasPosition && (
              <button 
                className={`close-btn ${step.highlight === 'close-button' ? 'highlighted pulse' : ''}`}
                onClick={handleClose}
              >
                CLOSE POSITION
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tutorial Tooltip */}
      {!badgeUnlocked && (
        <div className={`tutorial-tooltip step-${currentStep}`}>
          <div className="tooltip-arrow" />
          <h3>{step.title}</h3>
          <p>{step.description}</p>
          {!step.action && currentStep < 2 && (
            <button className="next-btn" onClick={nextStep}>
              Continue →
            </button>
          )}
        </div>
      )}

      <style jsx>{`
        .rookie-onboarding {
          min-height: 100vh;
          background: #0a0d14;
          position: relative;
          overflow: hidden;
        }

        /* Confetti */
        .confetti-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 1000;
        }

        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -20px;
          border-radius: 2px;
          animation: confetti-fall 3s linear forwards;
        }

        @keyframes confetti-fall {
          to {
            transform: translateY(100vh) rotate(720deg);
          }
        }

        /* Badge Modal */
        .badge-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          animation: fadeIn 0.5s ease;
        }

        .badge-content {
          text-align: center;
          padding: 48px;
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          border: 2px solid #00d4aa;
          border-radius: 24px;
          animation: scaleIn 0.5s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .badge-icon {
          font-size: 80px;
          margin-bottom: 16px;
          animation: bounce 1s infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .badge-content h2 {
          font-size: 32px;
          color: #f8fafc;
          margin-bottom: 8px;
        }

        .badge-name {
          font-size: 24px;
          color: #00d4aa;
          font-weight: 700;
          margin-bottom: 16px;
        }

        .badge-content p {
          font-size: 16px;
          color: #94a3b8;
          margin-bottom: 24px;
        }

        .profit-display {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid #10b981;
          border-radius: 12px;
          padding: 16px 32px;
          display: inline-block;
          margin-bottom: 24px;
        }

        .profit-label {
          display: block;
          font-size: 14px;
          color: #94a3b8;
          margin-bottom: 4px;
        }

        .profit-value {
          font-size: 32px;
          font-weight: 700;
          color: #10b981;
        }

        .next-hint {
          font-size: 14px;
          color: #64748b;
        }

        /* Dim Overlay */
        .dim-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
          z-index: 10;
        }

        .dim-overlay.active {
          opacity: 1;
        }

        /* Mock Header */
        .mock-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: #0f172a;
          border-bottom: 1px solid #1e293b;
          position: relative;
          z-index: 1;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #00d4aa 0%, #00a085 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
          color: #0d0f14;
        }

        .logo-text {
          font-size: 20px;
          font-weight: 700;
          color: #f8fafc;
        }

        .balance {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .balance-label {
          font-size: 12px;
          color: #64748b;
        }

        .balance-value {
          font-size: 24px;
          font-weight: 700;
          color: #00d4aa;
        }

        /* Main Content */
        .main-content {
          display: flex;
          height: calc(100vh - 73px);
          position: relative;
          z-index: 1;
        }

        /* Chart Area */
        .chart-area {
          flex: 1;
          padding: 24px;
          position: relative;
          z-index: 5;
          transition: all 0.3s ease;
        }

        .chart-area.highlighted {
          z-index: 20;
          background: #0a0d14;
          border-radius: 12px;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .symbol {
          font-size: 20px;
          font-weight: 600;
          color: #f8fafc;
        }

        .price {
          font-size: 28px;
          font-weight: 700;
        }

        .price.positive { color: #10b981; }
        .price.negative { color: #ef4444; }

        .chart-body {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 24px;
          height: calc(100% - 60px);
        }

        .mock-chart {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          height: 100%;
        }

        .mock-candle {
          flex: 1;
          border-radius: 2px;
          min-width: 12px;
        }

        .mock-candle.green {
          background: linear-gradient(180deg, #10b981 0%, #059669 100%);
        }

        .mock-candle.red {
          background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
        }

        /* Order Panel */
        .order-panel {
          width: 320px;
          padding: 24px;
          background: #0f172a;
          border-left: 1px solid #1e293b;
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
          z-index: 5;
        }

        .pnl-display {
          padding: 20px;
          border-radius: 12px;
          text-align: center;
          transition: all 0.3s ease;
        }

        .pnl-display.positive {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid #10b981;
        }

        .pnl-display.negative {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
        }

        .pnl-display.highlighted {
          z-index: 20;
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);
        }

        .pnl-label {
          display: block;
          font-size: 14px;
          color: #94a3b8;
          margin-bottom: 8px;
        }

        .pnl-value {
          font-size: 28px;
          font-weight: 700;
        }

        .pnl-display.positive .pnl-value { color: #10b981; }
        .pnl-display.negative .pnl-value { color: #ef4444; }

        .buy-btn, .close-btn {
          padding: 20px;
          border: none;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .buy-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .buy-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .close-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
        }

        .buy-btn.highlighted, .close-btn.highlighted {
          z-index: 20;
          position: relative;
        }

        .pulse {
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 212, 170, 0.7); }
          50% { box-shadow: 0 0 20px 10px rgba(0, 212, 170, 0.3); }
        }

        /* Tutorial Tooltip */
        .tutorial-tooltip {
          position: fixed;
          background: #1e293b;
          border: 2px solid #00d4aa;
          border-radius: 16px;
          padding: 24px;
          max-width: 360px;
          z-index: 100;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          animation: tooltipIn 0.3s ease;
        }

        @keyframes tooltipIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .tutorial-tooltip.step-0,
        .tutorial-tooltip.step-1 {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .tutorial-tooltip.step-2,
        .tutorial-tooltip.step-3,
        .tutorial-tooltip.step-4 {
          top: 50%;
          right: 360px;
          transform: translateY(-50%);
        }

        .tooltip-arrow {
          position: absolute;
          width: 16px;
          height: 16px;
          background: #1e293b;
          border-right: 2px solid #00d4aa;
          border-bottom: 2px solid #00d4aa;
          transform: rotate(-45deg);
        }

        .tutorial-tooltip.step-2 .tooltip-arrow,
        .tutorial-tooltip.step-3 .tooltip-arrow,
        .tutorial-tooltip.step-4 .tooltip-arrow {
          right: -10px;
          top: 50%;
          margin-top: -8px;
        }

        .tutorial-tooltip h3 {
          font-size: 20px;
          color: #f8fafc;
          margin-bottom: 12px;
        }

        .tutorial-tooltip p {
          font-size: 15px;
          line-height: 1.6;
          color: #94a3b8;
          margin-bottom: 16px;
        }

        .next-btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #00d4aa 0%, #00a085 100%);
          border: none;
          border-radius: 8px;
          color: #0d0f14;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .next-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0, 212, 170, 0.4);
        }
      `}</style>
    </div>
  );
}
