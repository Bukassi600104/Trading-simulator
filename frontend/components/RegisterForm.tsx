/**
 * Register Form Component - Terminal Zero
 * New user registration with onboarding redirect
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useOnboardingStore } from '../stores/onboardingStore';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export default function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  
  const { register, isLoading, error, clearError } = useAuthStore();
  const { resetOnboarding } = useOnboardingStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    
    // Validate password strength
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }
    
    const success = await register(email, password);
    if (success) {
      // Reset onboarding for new user
      resetOnboarding();
      
      // Close modal
      if (onSuccess) {
        onSuccess();
      }
      
      // Redirect to onboarding
      router.push('/onboarding');
    }
  };

  const displayError = localError || error;

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!password) return { strength: 0, label: '' };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    return { strength, label: labels[strength] };
  };

  const { strength, label } = getPasswordStrength();

  return (
    <div className="register-form">
      <h2>Create Account</h2>
      <p className="subtitle">Start your trading journey</p>
      
      {displayError && (
        <div className="error-alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{displayError}</span>
          <button onClick={() => { clearError(); setLocalError(null); }} className="dismiss">×</button>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="reg-email">Email Address</label>
          <div className="input-wrapper">
            <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <input
              type="email"
              id="reg-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />
          </div>
        </div>
        
        <div className="field">
          <label htmlFor="reg-password">Password</label>
          <div className="input-wrapper">
            <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input
              type={showPassword ? 'text' : 'password'}
              id="reg-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
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
          
          {/* Password Strength Meter */}
          {password && (
            <div className="strength-meter">
              <div className="strength-bars">
                {[1, 2, 3, 4].map((level) => (
                  <div key={level} className={`bar ${level <= strength ? `level-${strength}` : ''}`} />
                ))}
              </div>
              <span className={`strength-label level-${strength}`}>{label}</span>
            </div>
          )}
        </div>
        
        <div className="field">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <div className="input-wrapper">
            <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <input
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              minLength={8}
              disabled={isLoading}
            />
            {confirmPassword && password === confirmPassword && (
              <span className="match-check">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            )}
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
              Creating Account...
            </>
          ) : (
            <>
              Create Account
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </form>
      
      {onSwitchToLogin && (
        <p className="switch-text">
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="link-btn">
            Sign In
          </button>
        </p>
      )}
      
      <style jsx>{`
        .register-form {
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

        .match-check {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--profit-400);
          display: flex;
        }

        /* Password Strength */
        .strength-meter {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 10px;
        }

        .strength-bars {
          display: flex;
          gap: 4px;
          flex: 1;
        }

        .bar {
          flex: 1;
          height: 4px;
          background: var(--border-subtle);
          border-radius: 2px;
          transition: background var(--transition-fast);
        }

        .bar.level-1 { background: var(--loss-500); }
        .bar.level-2 { background: var(--warning-500); }
        .bar.level-3 { background: var(--mint-500); }
        .bar.level-4 { background: var(--profit-500); }

        .strength-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .strength-label.level-1 { color: var(--loss-400); }
        .strength-label.level-2 { color: var(--warning-400); }
        .strength-label.level-3 { color: var(--mint-400); }
        .strength-label.level-4 { color: var(--profit-400); }
        
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
