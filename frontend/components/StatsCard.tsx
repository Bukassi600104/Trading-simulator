"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  locked?: boolean;
  featureName?: string;
  icon?: React.ReactNode;
}

const UpgradeModalLazy = dynamic(() => import("@/components/billing/UpgradeModal"), { ssr: false });

export default function StatsCard({
  title,
  value,
  subtitle,
  change,
  locked,
  featureName,
  icon,
}: StatsCardProps) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  return (
    <>
      <div
        onClick={locked ? () => setUpgradeOpen(true) : undefined}
        className={`relative bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4 ${
          locked ? "cursor-pointer group" : ""
        }`}
      >
        {icon && (
          <div className="mb-2 text-dark-400">{icon}</div>
        )}
        <span className="text-xs font-medium text-dark-500 uppercase tracking-wider">
          {title}
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span
            className={`font-mono text-2xl font-bold text-dark-50 ${
              locked ? "blur-sm select-none" : ""
            }`}
          >
            {value}
          </span>
          {change !== undefined && !locked && (
            <span
              className={`text-xs font-semibold font-mono px-2 py-0.5 rounded-md ${
                change >= 0
                  ? "text-profit-400 bg-profit-500/10"
                  : "text-loss-400 bg-loss-500/10"
              }`}
            >
              {change >= 0 ? "+" : ""}
              {change.toFixed(1)}%
            </span>
          )}
        </div>
        {subtitle && !locked && (
          <span className="text-xs text-dark-500 mt-1 block">{subtitle}</span>
        )}

        {locked && (
          <div className="absolute inset-0 rounded-lg flex flex-col items-center justify-center bg-[#0d0d1a]/80 backdrop-blur-[2px]">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-amber-400 mb-1"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-xs font-semibold text-amber-400">
              Pro Feature
            </span>
          </div>
        )}
      </div>

      {locked && (
        <UpgradeModalLazy
          isOpen={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          featureName={featureName}
        />
      )}
    </>
  );
}
