"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { tabContent } from "@/lib/animations";

export interface TabItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  children?: React.ReactNode;
  className?: string;
  variant?: "default" | "pills" | "underline";
}

interface TabContentProps {
  value: string;
  activeValue: string;
  children: React.ReactNode;
  className?: string;
}

function Tabs({
  items,
  value: controlledValue,
  defaultValue,
  onChange,
  children,
  className,
  variant = "default",
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || items[0]?.value || "");
  const activeValue = controlledValue ?? internalValue;

  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const updateIndicator = useCallback(() => {
    const activeTab = tabRefs.current.get(activeValue);
    const container = tabsRef.current;
    if (activeTab && container) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();
      setIndicatorStyle({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      });
    }
  }, [activeValue]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  const handleSelect = (val: string) => {
    if (!controlledValue) setInternalValue(val);
    onChange?.(val);
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Tab list */}
      <div
        ref={tabsRef}
        className={cn(
          "relative flex",
          variant === "default" && "gap-1 rounded-lg bg-dark-900/60 p-1",
          variant === "pills" && "gap-2",
          variant === "underline" && "gap-0 border-b border-dark-700/50"
        )}
        role="tablist"
      >
        {/* Animated indicator */}
        {variant === "default" && (
          <motion.div
            className="absolute top-1 bottom-1 rounded-md bg-dark-700"
            animate={{ left: indicatorStyle.left, width: indicatorStyle.width }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            aria-hidden="true"
          />
        )}

        {variant === "underline" && (
          <motion.div
            className="absolute bottom-0 h-[2px] bg-primary-500"
            animate={{ left: indicatorStyle.left, width: indicatorStyle.width }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            aria-hidden="true"
          />
        )}

        {items.map((item) => (
          <button
            key={item.value}
            ref={(el) => {
              if (el) tabRefs.current.set(item.value, el);
            }}
            role="tab"
            aria-selected={activeValue === item.value}
            aria-controls={`tab-panel-${item.value}`}
            disabled={item.disabled}
            className={cn(
              "relative z-10 flex items-center gap-1.5 whitespace-nowrap text-sm font-medium transition-colors select-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              variant === "default" && [
                "px-3 py-1.5 rounded-md",
                activeValue === item.value
                  ? "text-dark-100"
                  : "text-dark-400 hover:text-dark-300",
              ],
              variant === "pills" && [
                "px-4 py-2 rounded-full",
                activeValue === item.value
                  ? "bg-primary-500/15 text-primary-400 border border-primary-500/30"
                  : "text-dark-400 hover:text-dark-300 hover:bg-dark-800",
              ],
              variant === "underline" && [
                "px-4 py-2.5",
                activeValue === item.value
                  ? "text-dark-100"
                  : "text-dark-400 hover:text-dark-300",
              ]
            )}
            onClick={() => handleSelect(item.value)}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  activeValue === item.value
                    ? "bg-primary-500/20 text-primary-400"
                    : "bg-dark-700 text-dark-400"
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {children}
      </AnimatePresence>
    </div>
  );
}

function TabContent({ value, activeValue, children, className }: TabContentProps) {
  if (value !== activeValue) return null;

  return (
    <motion.div
      key={value}
      role="tabpanel"
      id={`tab-panel-${value}`}
      variants={tabContent}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn("mt-4", className)}
    >
      {children}
    </motion.div>
  );
}

export { Tabs, TabContent };
