"use client";

import { useAuthStore } from "@/stores/authStore";
import { useState } from "react";

interface ForgotPasswordFormProps {
  onBackToLogin?: () => void;
}

export default function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const { requestPasswordReset, resetPassword, isLoading, error, clearError } = useAuthStore();

  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setNotice(null);

    const result = await requestPasswordReset(email);
    if (!result) return;

    setNotice(result.message);
    if (result.reset_token) {
      setResetToken(result.reset_token);
      setStep("reset");
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setNotice(null);

    const ok = await resetPassword(resetToken, newPassword);
    if (ok) {
      setNotice("Password updated. You can sign in now.");
      if (onBackToLogin) onBackToLogin();
    }
  };

  return (
    <div className="forgot-form">
      <h2>Reset Password</h2>
      <p className="subtitle">Enter your email to receive a reset token.</p>

      {notice && <div className="notice">{notice}</div>}

      {error && (
        <div className="error-alert">
          <span>{error}</span>
          <button onClick={clearError} className="dismiss">×</button>
        </div>
      )}

      {step === "request" ? (
        <form onSubmit={handleRequest}>
          <div className="field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />
          </div>

          <button className="submit-btn" type="submit" disabled={isLoading}>
            {isLoading ? "Requesting..." : "Request Reset"}
          </button>

          {onBackToLogin && (
            <button type="button" className="link" onClick={onBackToLogin} disabled={isLoading}>
              Back to Sign In
            </button>
          )}
        </form>
      ) : (
        <form onSubmit={handleReset}>
          <div className="field">
            <label htmlFor="token">Reset Token</label>
            <textarea
              id="token"
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              placeholder="Paste the reset token here"
              required
              rows={4}
              disabled={isLoading}
            />
          </div>

          <div className="field">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              disabled={isLoading}
            />
          </div>

          <button className="submit-btn" type="submit" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Password"}
          </button>

          {onBackToLogin && (
            <button type="button" className="link" onClick={onBackToLogin} disabled={isLoading}>
              Back to Sign In
            </button>
          )}
        </form>
      )}

      <style jsx>{`
        .forgot-form {
          width: 100%;
        }

        h2 {
          margin: 0 0 6px 0;
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .subtitle {
          margin: 0 0 18px 0;
          color: var(--text-muted);
          font-size: 14px;
        }

        .notice {
          margin-bottom: 14px;
          padding: 12px 14px;
          border-radius: var(--radius-md);
          background: rgba(0, 230, 160, 0.08);
          border: 1px solid rgba(0, 230, 160, 0.22);
          color: var(--mint-400);
          font-size: 13px;
        }

        .error-alert {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 14px;
          margin-bottom: 14px;
          background: var(--loss-glow);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-md);
          color: var(--loss-400);
          font-size: 13px;
        }

        .dismiss {
          background: none;
          border: none;
          color: var(--loss-400);
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
          padding: 0;
          opacity: 0.7;
          transition: opacity var(--transition-fast);
        }

        .dismiss:hover {
          opacity: 1;
        }

        .field {
          margin-bottom: 14px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 500;
        }

        input,
        textarea {
          width: 100%;
          padding: 12px 12px;
          background: var(--depth);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          outline: none;
          font-size: 14px;
        }

        textarea {
          resize: vertical;
        }

        input:focus,
        textarea:focus {
          border-color: rgba(0, 230, 160, 0.35);
          box-shadow: 0 0 0 3px rgba(0, 230, 160, 0.08);
        }

        .submit-btn {
          width: 100%;
          height: 44px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, var(--mint-500), var(--mint-600));
          color: var(--void);
          border: none;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          transition: transform var(--transition-fast);
        }

        .submit-btn:hover {
          transform: translateY(-1px);
        }

        .link {
          width: 100%;
          margin-top: 10px;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 13px;
        }

        .link:hover {
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
