"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// --- Linear Progress Bar ---
export interface ProgressProps {
  value: number; // 0-100
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  color?: "primary" | "emerald" | "rose" | "amber";
  className?: string;
  animated?: boolean;
}

const sizeMap = { sm: "h-1", md: "h-2", lg: "h-3" };

const colorMap = {
  primary: "bg-primary-500",
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
};

const glowMap = {
  primary: "shadow-[0_0_8px_rgba(59,130,246,0.4)]",
  emerald: "shadow-[0_0_8px_rgba(16,185,129,0.4)]",
  rose: "shadow-[0_0_8px_rgba(244,63,94,0.4)]",
  amber: "shadow-[0_0_8px_rgba(245,158,11,0.4)]",
};

function Progress({
  value,
  max = 100,
  label,
  showValue = false,
  size = "md",
  color = "primary",
  className,
  animated = true,
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && <span className="text-xs font-medium text-dark-400">{label}</span>}
          {showValue && (
            <span className="font-mono text-xs font-semibold text-dark-300">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}

      <div
        className={cn("w-full overflow-hidden rounded-full bg-dark-800", sizeMap[size])}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        {animated ? (
          <motion.div
            className={cn("h-full rounded-full", colorMap[color], glowMap[color])}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
          />
        ) : (
          <div
            className={cn("h-full rounded-full transition-all duration-300", colorMap[color], glowMap[color])}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
    </div>
  );
}

// --- Circular Gauge ---
export interface GaugeProps {
  value: number; // 0-100
  size?: number; // px
  strokeWidth?: number;
  color?: "primary" | "emerald" | "rose" | "amber";
  label?: string;
  showValue?: boolean;
  className?: string;
}

const strokeColorMap = {
  primary: "stroke-primary-500",
  emerald: "stroke-emerald-500",
  rose: "stroke-rose-500",
  amber: "stroke-amber-500",
};

function Gauge({
  value,
  size = 80,
  strokeWidth = 6,
  color = "primary",
  label,
  showValue = true,
  className,
}: GaugeProps) {
  const percentage = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("inline-flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="stroke-dark-800"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={strokeColorMap[color]}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
          />
        </svg>

        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-sm font-bold text-dark-200">
              {Math.round(percentage)}
            </span>
          </div>
        )}
      </div>

      {label && (
        <span className="text-[10px] font-medium uppercase tracking-wider text-dark-500">
          {label}
        </span>
      )}
    </div>
  );
}

export { Progress, Gauge };
