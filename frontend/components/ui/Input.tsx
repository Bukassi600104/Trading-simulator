"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  mono?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, mono = false, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-xs font-medium text-dark-400 uppercase tracking-wider"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" aria-hidden="true">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full rounded-[10px] border bg-dark-900 px-3.5 py-2.5 text-sm text-dark-100 placeholder:text-dark-500",
              "transition-all duration-150",
              "border-dark-700/50",
              "focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
              "hover:border-dark-600",
              error && "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              mono && "font-mono",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-dark-800",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500" aria-hidden="true">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-rose-400" role="alert">
            {error}
          </p>
        )}

        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-dark-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
