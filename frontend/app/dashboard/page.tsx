"use client";

import AuthModal from "@/components/AuthModal";
import AffiliateWidget from "@/components/dashboard/AffiliateWidget";
import ClanWidget from "@/components/dashboard/ClanWidget";
import EquityCurve from "@/components/dashboard/EquityCurve";
import OpenPositionsSummary from "@/components/dashboard/OpenPositionsSummary";
import PropChallengeWidget from "@/components/dashboard/PropChallengeWidget";
import StatCard from "@/components/dashboard/StatCard";
import Navbar from "@/components/layout/Navbar";
import { API_BASE } from "@/lib/runtimeConfig";
import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [portfolioData, setPortfolioData] = useState({
    balance: 104230,
    equity: 104230,
    unrealizedPnl: 1250,
    winRate: 68,
  });
  // Use state for date/time to avoid hydration mismatch (server vs client timezone)
  const [dateTime, setDateTime] = useState<{ date: string; time: string } | null>(null);

  const { checkAuth } = useAuthStore();
  useOnboardingStore();  // Keep store active but don't destructure

  // Check auth only - NO auto-redirects to onboarding
  // Users should explicitly navigate to onboarding from landing page
  useEffect(() => {
    const checkAndRedirect = async () => {
      const isValid = await checkAuth();

      if (!isValid) {
        setAuthModalOpen(true);
      }

      setIsChecking(false);
    };
    
    checkAndRedirect();
    fetchPortfolioData();

    // Set date/time only on client to avoid hydration mismatch
    const updateDateTime = () => {
      setDateTime({
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        }),
        time: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      });
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [checkAuth]);

  const fetchPortfolioData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/trading/portfolio`);
      if (response.ok) {
        const data = await response.json();
        setPortfolioData({
          balance: parseFloat(String(data.balance)) || 104230,
          equity: parseFloat(String(data.equity)) || 104230,
          unrealizedPnl: parseFloat(String(data.total_unrealized_pnl)) || 0,
          winRate: 68,
        });
      }
    } catch (err) {
      console.error("Failed to fetch portfolio:", err);
    }
  };

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading Midnight Trader...</p>
        </div>
        <style jsx>{`
          .loading-screen {
            min-height: 100vh;
            background: #0a0d14;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .loading-spinner {
            text-align: center;
          }
          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #1e293b;
            border-top-color: #00d4aa;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .loading-spinner p {
            color: #94a3b8;
            font-size: 16px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <Navbar onOpenAuth={() => setAuthModalOpen(true)} />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <main className="dashboard-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="header-left">
            <h1>Main Dashboard</h1>
            <span className="date-time">
              {dateTime ? `${dateTime.date} · ${dateTime.time} UTC` : "Loading..."}
            </span>
          </div>
          <div className="header-right">
            <button className="notification-btn" aria-label="Notifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            <button className="settings-btn" aria-label="Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-1.41 3.41H17a1.65 1.65 0 0 0-1.51 1v.09a2 2 0 0 1-3.98 0v-.09a1.65 1.65 0 0 0-1.51-1H7a2 2 0 0 1-1.41-3.41l.06-.06A1.65 1.65 0 0 0 6 15a1.65 1.65 0 0 0-1-1.51H5a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 6 8a1.65 1.65 0 0 0-.35-1.82l-.06-.06A2 2 0 0 1 7.99 2.7H8a1.65 1.65 0 0 0 1.51-1V1.7a2 2 0 0 1 3.98 0v.09A1.65 1.65 0 0 0 15 2.7h.01a2 2 0 0 1 1.41 3.41l-.06.06A1.65 1.65 0 0 0 18 8c0 .66.39 1.26 1 1.51H19a2 2 0 0 1 0 4h-.09c-.61.25-1 .85-1 1.49z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          {/* Left Column - Portfolio Health */}
          <div className="left-column">
            <EquityCurve />

            <StatCard
              label="Total Balance"
              value={`$${portfolioData.balance.toLocaleString()}`}
              icon="💰"
            />

            <StatCard
              label="Win Rate"
              value={`${portfolioData.winRate}%`}
              icon="🎯"
              trend="up"
            />

            <StatCard
              label="Unrealized PNL"
              value={`${portfolioData.unrealizedPnl >= 0 ? "+" : ""}$${portfolioData.unrealizedPnl.toLocaleString()}`}
              icon={portfolioData.unrealizedPnl >= 0 ? "📈" : "📉"}
              trend={portfolioData.unrealizedPnl >= 0 ? "up" : "down"}
            />
          </div>

          {/* Middle Column - Active Status */}
          <div className="middle-column">
            <PropChallengeWidget
              currentAmount={portfolioData.balance}
              targetAmount={110000}
              phase="Phase 1 Evaluation"
            />

            <OpenPositionsSummary />
          </div>

          {/* Right Column - Social/News */}
          <div className="right-column">
            <ClanWidget />
            <AffiliateWidget />
          </div>
        </div>
      </main>

      <style jsx>{`
        .dashboard-page {
          min-height: 100vh;
          background: #0F172A;
        }

        .dashboard-content {
          max-width: 1800px;
          margin: 0 auto;
          padding: 24px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .header-left h1 {
          font-size: 28px;
          font-weight: 700;
          color: #F1F5F9;
          margin: 0 0 4px 0;
        }

        .date-time {
          font-size: 13px;
          color: #64748B;
        }

        .header-right {
          display: flex;
          gap: 12px;
        }

        .notification-btn,
        .settings-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #1E293B;
          border: 1px solid #334155;
          color: #94A3B8;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .notification-btn:hover,
        .settings-btn:hover {
          background: #334155;
          color: #F1F5F9;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 280px 1fr 300px;
          gap: 24px;
        }

        .left-column {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .middle-column {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .right-column {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (max-width: 1400px) {
          .dashboard-grid {
            grid-template-columns: 1fr 1fr;
          }

          .right-column {
            grid-column: span 2;
            flex-direction: row;
          }

          .right-column > :global(*) {
            flex: 1;
          }
        }

        @media (max-width: 900px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }

          .right-column {
            grid-column: span 1;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
