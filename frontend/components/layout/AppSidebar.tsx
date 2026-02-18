"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/trade",
    label: "Trade",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
        <polyline points="16,7 22,7 22,13" />
      </svg>
    ),
  },
  {
    href: "/journal",
    label: "Journal",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        <line x1="8" y1="7" x2="16" y2="7" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    ),
  },
  {
    href: "/challenge",
    label: "Challenge",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
        <path d="M18 2H6v7a6 6 0 0012 0V2z" />
      </svg>
    ),
  },
  {
    href: "/community",
    label: "Community",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    href: "/replay",
    label: "Replay",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5,3 19,12 5,21" />
        <line x1="2" y1="3" x2="2" y2="21" />
      </svg>
    ),
  },
];

const bottomNavItems: NavItem[] = [
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

export default function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <motion.aside
      className="relative flex flex-col border-r border-dark-700/40 bg-dark-900"
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Logo */}
      <div className="flex h-[60px] items-center border-b border-dark-700/40 px-4">
        <Link href="/dashboard" className="flex items-center gap-3 text-decoration-none">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 font-mono text-sm font-bold text-white">
            T0
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap text-sm font-bold text-dark-100 tracking-tight"
              >
                Terminal Zero
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-1 px-2 py-4" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="space-y-1 border-t border-dark-700/40 px-2 py-3">
        {bottomNavItems.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />
        ))}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-[72px] z-20 flex h-6 w-6 items-center justify-center rounded-full border border-dark-700 bg-dark-800 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <polyline points="8,2 4,6 8,10" />
        </motion.svg>
      </button>
    </motion.aside>
  );
}

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
        active
          ? "bg-primary-500/10 text-primary-400"
          : "text-dark-400 hover:bg-dark-800 hover:text-dark-200",
        collapsed && "justify-center px-2"
      )}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
    >
      {/* Active indicator */}
      {active && (
        <motion.div
          layoutId="sidebar-indicator"
          className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-primary-500"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}

      <span className="flex-shrink-0">{item.icon}</span>

      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden whitespace-nowrap"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Tooltip for collapsed state */}
      {collapsed && (
        <div className="pointer-events-none absolute left-full ml-2 hidden rounded-md bg-dark-700 px-2.5 py-1.5 text-xs font-medium text-dark-200 shadow-lg group-hover:block">
          {item.label}
        </div>
      )}
    </Link>
  );
}
