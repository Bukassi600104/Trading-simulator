"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UserMenu from "../UserMenu";

interface NavbarProps {
  onOpenAuth?: () => void;
}

export default function Navbar({ onOpenAuth }: NavbarProps) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/trade", label: "Trade" },
    { href: "/journal", label: "Journal" },
    { href: "/challenge", label: "Challenge" },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Logo Section */}
        <Link href="/dashboard" className="logo-section">
          <div className="logo-mark">
            <span>T</span>
            <span className="zero">0</span>
          </div>
          <span className="logo-name">Terminal Zero</span>
          <div className="connection-status">
            <span className="status-dot" />
            <span>Live</span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="nav-links">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${isActive(link.href) ? "active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Section */}
        <div className="nav-right">
          <Link href="/challenge" className="cta-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>Go Pro</span>
          </Link>
          <UserMenu onOpenAuth={onOpenAuth || (() => {})} />
        </div>
      </div>

      <style jsx>{`
        .navbar {
          height: 60px;
          background: var(--surface);
          border-bottom: 1px solid var(--border-subtle);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .navbar-inner {
          height: 100%;
          max-width: 1800px;
          margin: 0 auto;
          padding: 0 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* Logo Section */
        .logo-section {
          display: flex;
          align-items: center;
          gap: 14px;
          text-decoration: none;
        }

        .logo-mark {
          width: 38px;
          height: 38px;
          background: linear-gradient(135deg, var(--mint-500), var(--mint-600));
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-weight: 700;
          font-size: 16px;
          color: var(--void);
          gap: 1px;
        }

        .logo-mark .zero {
          opacity: 0.7;
        }

        .logo-name {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.5px;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          background: var(--profit-glow);
          border: 1px solid rgba(0, 230, 160, 0.2);
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 600;
          color: var(--mint-400);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          background: var(--mint-500);
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }

        /* Navigation */
        .nav-links {
          display: flex;
          gap: 4px;
        }

        .nav-link {
          padding: 9px 18px;
          color: var(--text-muted);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }

        .nav-link:hover {
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.03);
        }

        .nav-link.active {
          color: var(--text-primary);
          background: var(--depth);
        }

        /* Right Section */
        .nav-right {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .cta-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 16px;
          background: linear-gradient(135deg, var(--mint-500), var(--mint-600));
          border-radius: var(--radius-md);
          color: var(--void);
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          transition: all var(--transition-fast);
          box-shadow: 0 4px 12px rgba(0, 230, 160, 0.2);
        }

        .cta-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0, 230, 160, 0.3);
        }

        /* Responsive */
        @media (max-width: 900px) {
          .nav-links {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .logo-name {
            display: none;
          }

          .connection-status {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
