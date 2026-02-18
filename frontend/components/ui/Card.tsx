"use client";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { cardHover } from "@/lib/animations";

// --- Base Card ---
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, glass = false, hover = false, padding = "md", children, ...props }, ref) => {
    const baseClasses = cn(
      "rounded-lg border transition-all duration-200",
      glass
        ? "bg-dark-900/70 backdrop-blur-xl border-white/[0.06]"
        : "bg-dark-800 border-dark-700/50",
      hover && "hover:border-dark-600 hover:shadow-card-hover cursor-pointer",
      paddingMap[padding],
      className
    );

    if (hover) {
      return (
        <motion.div
          ref={ref}
          className={baseClasses}
          variants={cardHover}
          initial="rest"
          whileHover="hover"
          whileTap="tap"
          {...(props as HTMLMotionProps<"div">)}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div ref={ref} className={baseClasses} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

// --- Card Header ---
const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center justify-between pb-4", className)}
      {...props}
    />
  )
);

CardHeader.displayName = "CardHeader";

// --- Card Title ---
const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-sm font-semibold text-dark-200 tracking-tight", className)}
      {...props}
    />
  )
);

CardTitle.displayName = "CardTitle";

// --- Card Content ---
const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("", className)} {...props} />
  )
);

CardContent.displayName = "CardContent";

// --- Stat Card ---
export interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

function StatCard({ label, value, change, icon, trend = "neutral", className }: StatCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-dark-400 uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-dark-700/50 text-dark-400">
            {icon}
          </div>
        )}
      </div>

      <div className="font-mono text-2xl font-bold text-dark-100 tracking-tight">
        {value}
      </div>

      {change && (
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-xs font-semibold",
            trend === "up" && "text-emerald-400",
            trend === "down" && "text-rose-400",
            trend === "neutral" && "text-dark-400"
          )}
        >
          {trend === "up" && (
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
              <path d="M6 2l4 5H2z" />
            </svg>
          )}
          {trend === "down" && (
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
              <path d="M6 10L2 5h8z" />
            </svg>
          )}
          {change}
        </div>
      )}

      {/* Subtle glow accent based on trend */}
      {trend === "up" && (
        <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-emerald-500/5 blur-2xl" aria-hidden="true" />
      )}
      {trend === "down" && (
        <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-rose-500/5 blur-2xl" aria-hidden="true" />
      )}
    </Card>
  );
}

export { Card, CardHeader, CardTitle, CardContent, StatCard };
