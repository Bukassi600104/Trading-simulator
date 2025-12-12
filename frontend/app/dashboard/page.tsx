"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Dashboard redirect page
 * This redirects to the main page (/) which handles the actual dashboard display.
 * The main page checks authentication and onboarding status.
 */
export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="loading-screen">
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading Dashboard...</p>
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
