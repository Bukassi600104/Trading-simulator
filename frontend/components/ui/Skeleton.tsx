"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

function Skeleton({
  className,
  variant = "rectangular",
  width,
  height,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-shimmer bg-gradient-to-r from-dark-800 via-dark-700 to-dark-800 bg-[length:200%_100%]",
        variant === "circular" && "rounded-full",
        variant === "text" && "rounded-md h-4",
        variant === "rectangular" && "rounded-lg",
        className
      )}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

// Convenience presets

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border border-dark-700/50 bg-dark-800 p-5 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="circular" width={32} height={32} />
      </div>
      <Skeleton variant="text" width="60%" height={28} />
      <Skeleton variant="text" width="30%" />
    </div>
  );
}

function SkeletonTable({ rows = 5, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-dark-700/50 overflow-hidden", className)}>
      {/* Header */}
      <div className="flex gap-4 bg-dark-800/80 px-4 py-3 border-b border-dark-700/50">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} variant="text" width={`${60 + Math.random() * 40}%`} height={12} className="flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 px-4 py-3 border-b border-dark-700/30 last:border-0">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" height={14} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border border-dark-700/50 bg-dark-800 p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="text" width={120} />
        <div className="flex gap-2">
          <Skeleton width={60} height={28} className="rounded-md" />
          <Skeleton width={60} height={28} className="rounded-md" />
        </div>
      </div>
      <Skeleton height={200} className="rounded-lg" />
    </div>
  );
}

function SkeletonAvatar({ size = 40, className }: { size?: number; className?: string }) {
  return <Skeleton variant="circular" width={size} height={size} className={className} />;
}

export { Skeleton, SkeletonCard, SkeletonTable, SkeletonChart, SkeletonAvatar };
