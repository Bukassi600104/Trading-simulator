"use client";

import { motion } from "framer-motion";

interface AchievementBadgeProps {
  type: string;
  name: string;
  description: string;
  xp: number;
  unlocked: boolean;
  unlockedAt?: string;
  size?: "small" | "large";
}

const ICONS: Record<string, string> = {
  first_trade: "\uD83C\uDFAF",
  streak_3: "\uD83D\uDD25",
  first_profit: "\uD83D\uDCB0",
  high_roller: "\uD83C\uDFB2",
  diversified: "\uD83C\uDF10",
};

export default function AchievementBadge({
  type,
  name,
  description,
  xp,
  unlocked,
  unlockedAt,
  size = "small",
}: AchievementBadgeProps) {
  const icon = ICONS[type] || "\u2B50";
  const px = size === "large" ? 96 : 48;

  return (
    <motion.div
      initial={unlocked ? { scale: 0.8, opacity: 0 } : false}
      animate={unlocked ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 1 }}
      transition={unlocked ? { type: "spring", stiffness: 300, damping: 20 } : undefined}
      className={`flex flex-col items-center gap-1 ${
        !unlocked ? "grayscale opacity-50" : ""
      }`}
      title={unlocked ? `${name}: ${description} (+${xp} XP)${unlockedAt ? ` - Unlocked ${new Date(unlockedAt).toLocaleDateString()}` : ""}` : `${name}: ${description} (Locked)`}
    >
      <div
        className={`flex items-center justify-center rounded-full border ${
          unlocked
            ? "border-amber-400/40 bg-amber-500/10 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
            : "border-white/[0.06] bg-t0-depth"
        }`}
        style={{ width: px, height: px }}
      >
        <span style={{ fontSize: size === "large" ? 40 : 20 }}>{icon}</span>
      </div>
      {size === "large" && (
        <>
          <span className="text-xs font-semibold text-dark-100 text-center mt-1">
            {name}
          </span>
          <span className="text-2xs text-dark-500 text-center">{description}</span>
          {unlocked && (
            <span className="text-2xs font-mono text-amber-400">+{xp} XP</span>
          )}
        </>
      )}
    </motion.div>
  );
}
