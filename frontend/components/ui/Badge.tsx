"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-semibold transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "bg-dark-700 text-dark-300 border border-dark-600",
        primary:
          "bg-primary-500/15 text-primary-400 border border-primary-500/30",
        success:
          "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
        danger:
          "bg-rose-500/15 text-rose-400 border border-rose-500/30",
        warning:
          "bg-amber-500/15 text-amber-400 border border-amber-500/30",
        // Emotion badges for trading psychology
        fomo:
          "bg-rose-500/15 text-rose-400 border border-rose-500/25",
        revenge:
          "bg-orange-500/15 text-orange-400 border border-orange-500/25",
        disciplined:
          "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
        fear:
          "bg-amber-500/15 text-amber-400 border border-amber-500/25",
        confident:
          "bg-primary-500/15 text-primary-400 border border-primary-500/25",
        // Tier badges
        bronze:
          "bg-orange-800/20 text-orange-300 border border-orange-600/30",
        silver:
          "bg-slate-400/15 text-slate-300 border border-slate-400/30",
        gold:
          "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30",
        diamond:
          "bg-cyan-500/15 text-cyan-300 border border-cyan-400/30",
      },
      size: {
        sm: "px-1.5 py-0.5 text-[10px] rounded-md",
        md: "px-2.5 py-0.5 text-xs rounded-full",
        lg: "px-3 py-1 text-sm rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
}

function Badge({ className, variant, size, dot, dotColor, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            dotColor || "bg-current"
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

// Status badge convenience component
interface StatusBadgeProps {
  active: boolean;
  className?: string;
}

function StatusBadge({ active, className }: StatusBadgeProps) {
  return (
    <Badge
      variant={active ? "success" : "default"}
      size="sm"
      dot
      className={className}
    >
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

// Emotion badge convenience component
type EmotionType = "fomo" | "revenge" | "disciplined" | "fear" | "confident";

const emotionLabels: Record<EmotionType, string> = {
  fomo: "FOMO",
  revenge: "Revenge",
  disciplined: "Disciplined",
  fear: "Fear",
  confident: "Confident",
};

interface EmotionBadgeProps {
  emotion: EmotionType;
  className?: string;
}

function EmotionBadge({ emotion, className }: EmotionBadgeProps) {
  return (
    <Badge variant={emotion} size="sm" className={cn("uppercase tracking-wider", className)}>
      {emotionLabels[emotion]}
    </Badge>
  );
}

// Tier badge convenience component
type TierType = "bronze" | "silver" | "gold" | "diamond";

const tierLabels: Record<TierType, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  diamond: "Diamond",
};

interface TierBadgeProps {
  tier: TierType;
  className?: string;
}

function TierBadge({ tier, className }: TierBadgeProps) {
  return (
    <Badge variant={tier} size="md" className={className}>
      {tierLabels[tier]}
    </Badge>
  );
}

export { Badge, badgeVariants, StatusBadge, EmotionBadge, TierBadge };
export type { EmotionType, TierType };
