"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

interface ExchangeNavProps {
  variant?: "public" | "app";
  onLoginClick?: () => void;
  onSignupClick?: () => void;
}

const publicLinks = [
  { href: "/", label: "Markets" },
  { href: "/trade", label: "Trade" },
  { href: "/learn/bitcoin-trading", label: "Learn" },
  { href: "/community", label: "Leaderboard" },
  { href: "/pricing", label: "Pricing" },
];

const appLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/trade", label: "Trade" },
  { href: "/challenge", label: "Challenges" },
  { href: "/community", label: "Leaderboard" },
  { href: "/coaching", label: "AI Coaching" },
];

function useScrollTrigger(threshold = 50): boolean {
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const handler = () => setTriggered(window.scrollY > threshold);
    handler(); // initialise
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [threshold]);

  return triggered;
}

// ─── Logo ────────────────────────────────────────────────────────────────────

function Logo({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 select-none">
      {/* Hexagon icon rendered with pure CSS / SVG */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <polygon
          points="14,2 25,8 25,20 14,26 3,20 3,8"
          fill="#11d473"
          fillOpacity="0.15"
          stroke="#11d473"
          strokeWidth="1.5"
        />
        <text
          x="14"
          y="18"
          textAnchor="middle"
          fontFamily="monospace"
          fontSize="11"
          fontWeight="700"
          fill="#11d473"
        >
          T0
        </text>
      </svg>
      <span
        style={{
          fontWeight: 700,
          fontSize: "15px",
          letterSpacing: "0.18em",
          color: "#ffffff",
          textTransform: "uppercase",
          fontFamily: "var(--font-display, Inter, sans-serif)",
          lineHeight: 1,
        }}
      >
        Terminal Zero
      </span>
    </Link>
  );
}

// ─── Bell icon ───────────────────────────────────────────────────────────────

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

// ─── Hamburger icon ───────────────────────────────────────────────────────────

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {open ? (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </>
      )}
    </svg>
  );
}

// ─── App-variant right section ────────────────────────────────────────────────

function AppRight() {
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Derive display values
  const balance = "$10,000.00"; // placeholder; wire to portfolio store when available
  const initials = user
    ? (user.email ?? "").slice(0, 2).toUpperCase()
    : "??";
  const username = user ? (user.email ?? "").split("@")[0] : "Guest";

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    router.push("/");
  };

  return (
    <div className="flex items-center gap-3">
      {/* Balance */}
      <div
        style={{
          fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
          fontSize: "13px",
          fontWeight: 600,
          color: "#11d473",
          background: "rgba(17,212,115,0.08)",
          border: "1px solid rgba(17,212,115,0.18)",
          borderRadius: "8px",
          padding: "5px 12px",
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
        }}
      >
        {balance}
      </div>

      {/* Notification bell */}
      <button
        aria-label="Notifications"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "36px",
          height: "36px",
          borderRadius: "8px",
          border: "1px solid rgba(148,163,184,0.12)",
          background: "transparent",
          color: "#94a3b8",
          cursor: "pointer",
          transition: "color 0.15s, background 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "#ffffff";
          (e.currentTarget as HTMLButtonElement).style.background =
            "rgba(255,255,255,0.05)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
          (e.currentTarget as HTMLButtonElement).style.background =
            "transparent";
        }}
      >
        <BellIcon />
      </button>

      {/* User avatar + dropdown */}
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          onClick={() => setMenuOpen((p) => !p)}
          aria-label="User menu"
          aria-expanded={menuOpen}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "4px 8px 4px 4px",
            borderRadius: "10px",
            border: "1px solid rgba(148,163,184,0.14)",
            background: "transparent",
            cursor: "pointer",
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.04)";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(148,163,184,0.24)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "transparent";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(148,163,184,0.14)";
          }}
        >
          {/* Avatar circle */}
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #11d473, #0fbc65)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "monospace",
              fontSize: "11px",
              fontWeight: 700,
              color: "#020617",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "#e2e8f0",
              maxWidth: "90px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {username}
          </span>
          {/* Chevron */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            style={{
              transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              width: "220px",
              background: "#0d1424",
              border: "1px solid rgba(148,163,184,0.12)",
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              zIndex: 200,
              animation: "navDropdownIn 0.18s ease-out",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid rgba(148,163,184,0.08)",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#94a3b8",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user?.email ?? ""}
              </div>
            </div>
            {/* Links */}
            <div style={{ padding: "6px" }}>
              {[
                { href: "/dashboard", label: "Dashboard" },
                { href: "/settings", label: "Settings" },
                { href: "/pricing", label: "Upgrade Plan" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "block",
                    padding: "9px 12px",
                    fontSize: "13px",
                    color: "#cbd5e1",
                    borderRadius: "8px",
                    textDecoration: "none",
                    transition: "background 0.12s, color 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background =
                      "rgba(255,255,255,0.04)";
                    (e.currentTarget as HTMLAnchorElement).style.color =
                      "#ffffff";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background =
                      "transparent";
                    (e.currentTarget as HTMLAnchorElement).style.color =
                      "#cbd5e1";
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            {/* Logout */}
            <div
              style={{
                padding: "6px",
                borderTop: "1px solid rgba(148,163,184,0.08)",
              }}
            >
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "9px 12px",
                  fontSize: "13px",
                  color: "#94a3b8",
                  borderRadius: "8px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.12s, color 0.12s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(239,68,68,0.08)";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "#f87171";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "#94a3b8";
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExchangeNav({
  variant = "public",
  onLoginClick,
  onSignupClick,
}: ExchangeNavProps) {
  const pathname = usePathname();
  const scrolled = useScrollTrigger(50);
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = variant === "app" ? appLinks : publicLinks;
  const logoHref = variant === "app" ? "/dashboard" : "/";

  const isActive = (href: string) => {
    if (href === "/" || href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = mobileOpen ? "hidden" : "";
    }
    return () => {
      if (typeof document !== "undefined") document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Keyframes injected once */}
      <style>{`
        @keyframes navDropdownIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes mobileSlideIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
      `}</style>

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          height: "60px",
          background: "rgba(2,6,23,0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: scrolled
            ? "1px solid rgba(148,163,184,0.12)"
            : "1px solid rgba(148,163,184,0.08)",
          boxShadow: scrolled ? "0 4px 20px rgba(0,0,0,0.4)" : "none",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
      >
        <div
          style={{
            height: "100%",
            maxWidth: "1440px",
            margin: "0 auto",
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          {/* LEFT — Logo */}
          <Logo href={logoHref} />

          {/* CENTER — Desktop nav links */}
          <nav
            aria-label="Main navigation"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              // Hide on mobile
              flex: 1,
              justifyContent: "center",
            }}
            className="exchange-nav-center"
          >
            {links.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: active ? 600 : 400,
                    color: active ? "#ffffff" : "#94a3b8",
                    textDecoration: "none",
                    background: active ? "rgba(255,255,255,0.07)" : "transparent",
                    transition: "color 0.15s, background 0.15s",
                    whiteSpace: "nowrap",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.color =
                        "#ffffff";
                      (e.currentTarget as HTMLAnchorElement).style.background =
                        "rgba(255,255,255,0.04)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.color =
                        "#94a3b8";
                      (e.currentTarget as HTMLAnchorElement).style.background =
                        "transparent";
                    }
                  }}
                >
                  {link.label}
                  {active && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: "2px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "18px",
                        height: "2px",
                        borderRadius: "2px",
                        background: "#11d473",
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* RIGHT — Actions */}
          <div
            style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}
            className="exchange-nav-right"
          >
            {variant === "public" ? (
              <>
                <button
                  onClick={onLoginClick}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid rgba(148,163,184,0.2)",
                    background: "transparent",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "border-color 0.15s, background 0.15s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "rgba(148,163,184,0.4)";
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "rgba(148,163,184,0.2)";
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                  }}
                >
                  Log In
                </button>
                <button
                  onClick={onSignupClick}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: "#11d473",
                    color: "#000000",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "none",
                    transition: "background 0.15s, transform 0.1s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "#0fbc65";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "#11d473";
                  }}
                >
                  Start Free
                </button>
              </>
            ) : (
              <AppRight />
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((p) => !p)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="exchange-nav-hamburger"
            style={{
              display: "none", // overridden by media query via className
              alignItems: "center",
              justifyContent: "center",
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              border: "1px solid rgba(148,163,184,0.14)",
              background: "transparent",
              color: "#94a3b8",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <HamburgerIcon open={mobileOpen} />
          </button>
        </div>
      </header>

      {/* Mobile slide-out menu */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 49,
            background: "rgba(2,6,23,0.6)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        className="exchange-nav-mobile-drawer"
        style={{
          position: "fixed",
          top: "60px",
          right: 0,
          bottom: 0,
          width: "280px",
          background: "#080c14",
          borderLeft: "1px solid rgba(148,163,184,0.1)",
          zIndex: 60,
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          overflowY: "auto",
          transform: mobileOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
          animation: mobileOpen ? "mobileSlideIn 0.25s ease-out" : "none",
        }}
        aria-label="Mobile navigation"
        role="navigation"
      >
        {links.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: "block",
                padding: "12px 16px",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: active ? 600 : 400,
                color: active ? "#11d473" : "#94a3b8",
                background: active ? "rgba(17,212,115,0.08)" : "transparent",
                textDecoration: "none",
                transition: "background 0.12s, color 0.12s",
                borderLeft: active ? "2px solid #11d473" : "2px solid transparent",
              }}
            >
              {link.label}
            </Link>
          );
        })}

        {/* Mobile CTA */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: "16px",
            borderTop: "1px solid rgba(148,163,184,0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {variant === "public" ? (
            <>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  onLoginClick?.();
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(148,163,184,0.2)",
                  background: "transparent",
                  color: "#ffffff",
                  fontSize: "15px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Log In
              </button>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  onSignupClick?.();
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  background: "#11d473",
                  color: "#000000",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                }}
              >
                Start Free
              </button>
            </>
          ) : (
            <Link
              href="/settings"
              onClick={() => setMobileOpen(false)}
              style={{
                display: "block",
                textAlign: "center",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid rgba(148,163,184,0.2)",
                background: "transparent",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Settings
            </Link>
          )}
        </div>
      </div>

      {/* Responsive overrides — inlined so we don't depend on Tailwind breakpoints */}
      <style>{`
        @media (max-width: 768px) {
          .exchange-nav-center { display: none !important; }
          .exchange-nav-right  { display: none !important; }
          .exchange-nav-hamburger { display: flex !important; }
        }
        @media (min-width: 769px) {
          .exchange-nav-mobile-drawer { display: none !important; }
        }
      `}</style>
    </>
  );
}
