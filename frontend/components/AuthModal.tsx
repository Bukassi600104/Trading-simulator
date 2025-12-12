/**
 * Auth Modal Component - Terminal Zero
 * Sleek modal with login/register tab switching
 */

'use client';

import { useEffect, useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register';
}

export default function AuthModal({ isOpen, onClose, initialTab = 'login' }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);

  // Reset to initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        
        {/* Header */}
        <div className="modal-header">
          <div className="logo-mark">
            <span>T</span>
            <span className="zero">0</span>
          </div>
          <h2>Welcome to Terminal Zero</h2>
          <p>Your trading journey starts here</p>
        </div>
        
        {/* Tabs */}
        <div className="auth-tabs">
          <button 
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            Sign In
          </button>
          <button 
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Create Account
          </button>
          <div 
            className="tab-indicator" 
            style={{ transform: `translateX(${activeTab === 'register' ? '100%' : '0'})` }} 
          />
        </div>
        
        {/* Form Container */}
        <div className="form-wrapper">
          {activeTab === 'login' ? (
            <LoginForm 
              onSuccess={onClose} 
              onSwitchToRegister={() => setActiveTab('register')}
            />
          ) : (
            <RegisterForm 
              onSuccess={onClose}
              onSwitchToLogin={() => setActiveTab('login')}
            />
          )}
        </div>
        
        {/* Footer */}
        <div className="modal-footer">
          <p>By continuing, you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a></p>
        </div>
      </div>
      
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(5, 8, 15, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .modal-container {
          position: relative;
          width: 100%;
          max-width: 440px;
          background: var(--surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          box-shadow: 
            0 0 0 1px rgba(0, 230, 160, 0.03),
            0 24px 80px rgba(0, 0, 0, 0.6);
          animation: slideUp 0.3s ease-out;
          max-height: 90vh;
          overflow-y: auto;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        /* Close Button */
        .close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--depth);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-muted);
          cursor: pointer;
          transition: all var(--transition-fast);
          z-index: 1;
        }
        
        .close-btn:hover {
          background: var(--loss-glow);
          border-color: var(--loss-400);
          color: var(--loss-400);
        }
        
        /* Header */
        .modal-header {
          padding: 36px 32px 24px;
          text-align: center;
        }
        
        .logo-mark {
          width: 56px;
          height: 56px;
          margin: 0 auto 20px;
          background: linear-gradient(135deg, var(--mint-500), var(--mint-600));
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-weight: 700;
          font-size: 22px;
          color: var(--void);
          gap: 1px;
        }

        .logo-mark .zero {
          opacity: 0.7;
        }

        .modal-header h2 {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 6px;
          letter-spacing: -0.5px;
        }

        .modal-header p {
          font-size: 14px;
          color: var(--text-muted);
          margin: 0;
        }
        
        /* Tabs */
        .auth-tabs {
          position: relative;
          display: flex;
          margin: 0 32px;
          background: var(--depth);
          border-radius: var(--radius-md);
          padding: 4px;
        }
        
        .auth-tab {
          flex: 1;
          position: relative;
          z-index: 1;
          padding: 11px;
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: color var(--transition-fast);
        }
        
        .auth-tab.active {
          color: var(--void);
        }

        .tab-indicator {
          position: absolute;
          top: 4px;
          left: 4px;
          width: calc(50% - 4px);
          height: calc(100% - 8px);
          background: linear-gradient(135deg, var(--mint-500), var(--mint-600));
          border-radius: var(--radius-sm);
          transition: transform var(--transition-base);
        }
        
        /* Form Wrapper */
        .form-wrapper {
          padding: 28px 32px;
        }
        
        /* Override nested form styles */
        .form-wrapper :global(.login-form),
        .form-wrapper :global(.register-form) {
          max-width: none;
          padding: 0;
          background: transparent;
          border: none;
          box-shadow: none;
        }
        
        .form-wrapper :global(h2),
        .form-wrapper :global(.subtitle),
        .form-wrapper :global(.switch-text) {
          display: none;
        }

        /* Footer */
        .modal-footer {
          padding: 0 32px 28px;
          text-align: center;
        }

        .modal-footer p {
          font-size: 12px;
          color: var(--text-ghost);
          margin: 0;
        }

        .modal-footer a {
          color: var(--mint-400);
          text-decoration: none;
          transition: color var(--transition-fast);
        }

        .modal-footer a:hover {
          color: var(--mint-300);
          text-decoration: underline;
        }

        /* Responsive */
        @media (max-width: 480px) {
          .modal-container {
            max-width: 100%;
            border-radius: var(--radius-lg);
          }

          .modal-header {
            padding: 28px 24px 20px;
          }

          .auth-tabs {
            margin: 0 24px;
          }

          .form-wrapper {
            padding: 24px;
          }

          .modal-footer {
            padding: 0 24px 24px;
          }
        }
      `}</style>
    </div>
  );
}
