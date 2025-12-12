/**
 * User Menu Component - Terminal Zero
 * User avatar dropdown with profile and settings
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../stores/authStore';

interface UserMenuProps {
  onOpenAuth: () => void;
}

export default function UserMenu({ onOpenAuth }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const { user, isAuthenticated, logout } = useAuthStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <button className="signin-btn" onClick={onOpenAuth}>
        Sign In
        <style jsx>{`
          .signin-btn {
            padding: 10px 18px;
            background: var(--depth);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            color: var(--text-secondary);
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition-fast);
          }
          
          .signin-btn:hover {
            border-color: var(--mint-500);
            color: var(--mint-400);
          }
        `}</style>
      </button>
    );
  }

  const initials = user.email.slice(0, 2).toUpperCase();

  const tierConfig: Record<string, { color: string; bg: string }> = {
    free: { color: 'var(--text-muted)', bg: 'var(--depth)' },
    FREE: { color: 'var(--text-muted)', bg: 'var(--depth)' },
    premium: { color: 'var(--mint-400)', bg: 'var(--mint-glow)' },
    pro: { color: 'var(--warning-400)', bg: 'rgba(245, 158, 11, 0.1)' },
    PRO: { color: 'var(--warning-400)', bg: 'rgba(245, 158, 11, 0.1)' },
    PROP_CHALLENGE: { color: 'var(--warning-400)', bg: 'rgba(245, 158, 11, 0.1)' },
  };

  const tier = tierConfig[user.tier] || tierConfig.free;

  return (
    <div className="user-menu" ref={menuRef}>
      <button className="user-trigger" onClick={() => setIsOpen(!isOpen)}>
        <div className="avatar">{initials}</div>
        <div className="user-meta">
          <span className="username">{user.email.split('@')[0]}</span>
          <span className="tier-badge" style={{ color: tier.color, background: tier.bg }}>
            {user.tier.toUpperCase().replace('_', ' ')}
          </span>
        </div>
        <svg className={`chevron ${isOpen ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="dropdown">
          <div className="dropdown-header">
            <span className="email">{user.email}</span>
            <span className="demo-tag">Demo Account</span>
          </div>
          
          <nav className="dropdown-nav">
            <button className="nav-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Profile
            </button>
            <button className="nav-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
              </svg>
              Statistics
            </button>
            <button className="nav-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Settings
            </button>
          </nav>
          
          <div className="dropdown-footer">
            <button className="logout-btn" onClick={() => { logout(); setIsOpen(false); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .user-menu {
          position: relative;
        }
        
        .user-trigger {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 10px 6px 6px;
          background: var(--depth);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .user-trigger:hover {
          border-color: var(--border-default);
        }
        
        .avatar {
          width: 34px;
          height: 34px;
          background: linear-gradient(135deg, var(--mint-500), var(--mint-600));
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 700;
          color: var(--void);
        }
        
        .user-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 3px;
        }
        
        .username {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .tier-badge {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.5px;
          padding: 2px 6px;
          border-radius: var(--radius-sm);
        }
        
        .chevron {
          color: var(--text-ghost);
          transition: transform var(--transition-fast);
        }
        
        .chevron.open {
          transform: rotate(180deg);
        }
        
        /* Dropdown */
        .dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 240px;
          background: var(--surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          overflow: hidden;
          animation: dropdownIn 0.2s ease-out;
          z-index: 100;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        
        @keyframes dropdownIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .dropdown-header {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .email {
          font-size: 13px;
          color: var(--text-primary);
          font-weight: 500;
        }

        .demo-tag {
          font-size: 10px;
          color: var(--mint-400);
          background: var(--mint-glow);
          padding: 3px 8px;
          border-radius: var(--radius-full);
          align-self: flex-start;
        }
        
        .dropdown-nav {
          padding: 8px;
        }
        
        .nav-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: none;
          border: none;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: left;
        }
        
        .nav-item:hover {
          background: var(--depth);
          color: var(--text-primary);
        }

        .nav-item svg {
          color: var(--text-muted);
        }

        .nav-item:hover svg {
          color: var(--mint-400);
        }
        
        .dropdown-footer {
          padding: 8px;
          border-top: 1px solid var(--border-subtle);
        }
        
        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: none;
          border: none;
          border-radius: var(--radius-md);
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .logout-btn:hover {
          background: var(--loss-glow);
          color: var(--loss-400);
        }

        .logout-btn:hover svg {
          color: var(--loss-400);
        }
      `}</style>
    </div>
  );
}
