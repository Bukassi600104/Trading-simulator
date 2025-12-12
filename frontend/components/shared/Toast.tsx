"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  addToast: (message: string, type: ToastType, duration?: number) => void;
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
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType, duration = 4000) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, duration);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
      <style jsx>{`
        .toast-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          flex-direction: column-reverse;
          gap: 12px;
          z-index: 9999;
          max-width: 400px;
        }
      `}</style>
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };

  const colors = {
    success: { bg: "rgba(16, 185, 129, 0.15)", border: "#10B981", icon: "#10B981" },
    error: { bg: "rgba(239, 68, 68, 0.15)", border: "#EF4444", icon: "#EF4444" },
    warning: { bg: "rgba(245, 158, 11, 0.15)", border: "#F59E0B", icon: "#F59E0B" },
    info: { bg: "rgba(59, 130, 246, 0.15)", border: "#3B82F6", icon: "#3B82F6" },
  };

  const colorScheme = colors[toast.type];

  return (
    <div className={`toast ${isExiting ? "exit" : ""}`}>
      <div className="toast-icon">{icons[toast.type]}</div>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={handleClose}>×</button>

      <style jsx>{`
        .toast {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          background: ${colorScheme.bg};
          border: 1px solid ${colorScheme.border};
          border-radius: 12px;
          backdrop-filter: blur(10px);
          animation: slideIn 0.3s ease-out;
        }

        .toast.exit {
          animation: slideOut 0.3s ease-in forwards;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        .toast-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${colorScheme.border};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }

        .toast-message {
          font-size: 14px;
          color: #F1F5F9;
          flex: 1;
        }

        .toast-close {
          width: 24px;
          height: 24px;
          background: transparent;
          border: none;
          color: #64748B;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .toast-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #F1F5F9;
        }
      `}</style>
    </div>
  );
}

// Standalone toast functions for use without context
let toastCallback: ((message: string, type: ToastType, duration?: number) => void) | null = null;

export function setToastCallback(callback: (message: string, type: ToastType, duration?: number) => void) {
  toastCallback = callback;
}

export function showToast(message: string, type: ToastType, duration = 4000) {
  if (toastCallback) {
    toastCallback(message, type, duration);
  }
}
