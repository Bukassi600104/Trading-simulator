"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { backdrop, modalContent } from "@/lib/animations";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showClose?: boolean;
}

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]",
};

function Modal({
  open,
  onClose,
  children,
  title,
  description,
  className,
  size = "md",
  closeOnBackdrop = true,
  closeOnEscape = true,
  showClose = true,
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape) {
        onClose();
      }
    },
    [onClose, closeOnEscape]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
      };
    }
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            variants={backdrop}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={closeOnBackdrop ? onClose : undefined}
            aria-hidden="true"
          />

          {/* Content */}
          <motion.div
            className={cn(
              "relative z-10 w-full overflow-hidden rounded-xl border border-dark-700/50 bg-dark-800 shadow-modal",
              sizeMap[size],
              className
            )}
            variants={modalContent}
            initial="initial"
            animate="animate"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {/* Header */}
            {(title || showClose) && (
              <div className="flex items-start justify-between border-b border-dark-700/50 px-6 py-4">
                <div>
                  {title && (
                    <h2 className="text-lg font-semibold text-dark-100">{title}</h2>
                  )}
                  {description && (
                    <p className="mt-0.5 text-sm text-dark-400">{description}</p>
                  )}
                </div>
                {showClose && (
                  <button
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200"
                    aria-label="Close modal"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// --- Modal Footer (convenience) ---
function ModalFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-end gap-3 border-t border-dark-700/50 -mx-6 -mb-5 mt-5 px-6 py-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { Modal, ModalFooter };
