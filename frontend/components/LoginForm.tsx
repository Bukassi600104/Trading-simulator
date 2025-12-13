/**
 * Login Form Component - Terminal Zero
 * Clean email/password login with demo mode
 */

'use client';

import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
  onForgotPassword?: () => void;
}

export default function LoginForm({ onSuccess, onSwitchToRegister, onForgotPassword }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, getDemoToken, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    const success = await login(email, password);
    if (success && onSuccess) {
      onSuccess();
    }
  };

  const handleDemoLogin = async () => {
    clearError();
    const success = await getDemoToken();
    if (success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="login-form">
      <h2>Sign In</h2>
      <p className="subtitle">Welcome back to Terminal Zero</p>
      
      {error && (
        <div className="error-alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button onClick={clearError} className="dismiss">×</button>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email Address</label>
          <div className="input-wrapper">
            <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />
          </div>
        </div>
        
        <div className="field">
          <div className="password-row">
            <label htmlFor="password">Password</label>
            {onForgotPassword && (
              <button type="button" className="forgot" onClick={onForgotPassword} disabled={isLoading}>
                Forgot?
              </button>
            )}
          </div>
          <div className="input-wrapper">
            <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              disabled={isLoading}
            />
            <button 
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Toggle password visibility"
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>
        
        <button 
          type="submit" 
          className="submit-btn"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>
      
      <div className="divider">
        <span>or continue with</span>
      </div>
      
      <button 
        onClick={handleDemoLogin}
        className="demo-btn"
        disabled={isLoading}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        {isLoading ? 'Loading...' : 'Try Demo Account'}
      </button>
      
      {onSwitchToRegister && (
        <p className="switch-text">
          New to Terminal Zero?{' '}
          <button onClick={onSwitchToRegister} className="link-btn">
            Create Account
          </button>
        </p>
      )}
      
      <style jsx>{`
        .login-form {
          width: 100%;
        }
        
        h2 {
          margin: 0 0 6px 0;
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
        }
        
        .subtitle {
          margin: 0 0 24px 0;
          color: var(--text-muted);
          font-size: 14px;
        }
        
        /* Error Alert */
        .error-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          margin-bottom: 20px;
          background: var(--loss-glow);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-md);
          color: var(--loss-400);
          font-size: 13px;
        }

        .error-alert svg {
          flex-shrink: 0;
        }

        .error-alert span {
          flex: 1;
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
        
        /* Form Fields */
        .field {
          margin-bottom: 18px;
        }

        .password-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }

        .password-row label {
          margin-bottom: 0;
        }

        .forgot {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
        }

        .forgot:hover {
          color: var(--text-secondary);
        }
        
        label {
          display: block;
          margin-bottom: 8px;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 500;
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-ghost);
          pointer-events: none;
        }
        
        input {
          width: 100%;
          padding: 13px 14px 13px 44px;
          background: var(--depth);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
          transition: all var(--transition-fast);
          box-sizing: border-box;
        }
        
        input:focus {
          border-color: var(--mint-500);
          box-shadow: 0 0 0 3px var(--mint-glow);
        }
        
        input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        input::placeholder {
          color: var(--text-ghost);
        }

        .toggle-password {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-ghost);
          cursor: pointer;
          padding: 0;
          display: flex;
          transition: color var(--transition-fast);
        }

        .toggle-password:hover {
          color: var(--text-muted);
        }
        
        /* Submit Button */
        .submit-btn {
          width: 100%;
          padding: 14px;
          margin-top: 6px;
          background: linear-gradient(135deg, var(--mint-500), var(--mint-600));
          border: none;
          border-radius: var(--radius-md);
          color: var(--void);
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(0, 230, 160, 0.35);
        }
        
        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(5, 8, 15, 0.3);
          border-top-color: var(--void);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Divider */
        .divider {
          display: flex;
          align-items: center;
          margin: 24px 0;
        }
        
        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border-subtle);
        }
        
        .divider span {
          padding: 0 14px;
          color: var(--text-ghost);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        /* Demo Button */
        .demo-btn {
          width: 100%;
          padding: 14px;
          background: var(--depth);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        
        .demo-btn:hover:not(:disabled) {
          border-color: var(--mint-500);
          color: var(--mint-400);
        }
        
        .demo-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        /* Switch Text */
        .switch-text {
          margin-top: 24px;
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
        }
        
        .link-btn {
          background: none;
          border: none;
          color: var(--mint-400);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          transition: color var(--transition-fast);
        }
        
        .link-btn:hover {
          color: var(--mint-300);
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
