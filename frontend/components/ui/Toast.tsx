"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toastSlide } from "@/lib/animations";

export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
}

interface ToastContextValue {
  addToast: (message: string, type: ToastType, opts?: { title?: string; duration?: number }) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType, opts?: { title?: string; duration?: number }) => {
      const id = Math.random().toString(36).substring(2, 9);
      const duration = opts?.duration ?? 4000;

      setToasts((prev) => [...prev, { id, message, type, title: opts?.title }]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    []
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

const iconMap: Record<ToastType, React.ReactNode> = {
  success: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 8.5l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5 5l6 6M11 5l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 5.5v.5M8 8v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

const colorMap: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: "bg-emerald-500 text-white" },
  error: { bg: "bg-rose-500/10", border: "border-rose-500/30", icon: "bg-rose-500 text-white" },
  warning: { bg: "bg-amber-500/10", border: "border-amber-500/30", icon: "bg-amber-500 text-white" },
  info: { bg: "bg-primary-500/10", border: "border-primary-500/30", icon: "bg-primary-500 text-white" },
};

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-3 max-w-[400px]"
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const colors = colorMap[toast.type];

  return (
    <motion.div
      layout
      variants={toastSlide}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3.5 backdrop-blur-md",
        colors.bg,
        colors.border
      )}
      role="alert"
    >
      <div className={cn("flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full", colors.icon)}>
        {iconMap[toast.type]}
      </div>

      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold text-dark-100">{toast.title}</p>
        )}
        <p className={cn("text-sm text-dark-200", toast.title && "mt-0.5")}>
          {toast.message}
        </p>
      </div>

      <button
        onClick={onClose}
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-dark-400 transition-colors hover:bg-white/10 hover:text-dark-200"
        aria-label="Dismiss notification"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M3 3l6 6M9 3l-6 6" />
        </svg>
      </button>
    </motion.div>
  );
}

// Standalone toast for imperative usage
let _addToast: ToastContextValue["addToast"] | null = null;

export function setToastCallback(cb: ToastContextValue["addToast"]) {
  _addToast = cb;
}

export function showToast(message: string, type: ToastType, duration?: number) {
  _addToast?.(message, type, { duration });
}
