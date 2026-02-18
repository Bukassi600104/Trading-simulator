"use client";

import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold text-sm transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-900 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-[0_2px_8px_rgba(59,130,246,0.35)] hover:shadow-[0_4px_16px_rgba(59,130,246,0.45)] hover:-translate-y-[1px] active:translate-y-0 active:shadow-[0_1px_4px_rgba(59,130,246,0.3)]",
        secondary:
          "bg-dark-700 text-dark-200 border border-dark-600 hover:bg-dark-600 hover:text-dark-100 hover:border-dark-500 active:bg-dark-700",
        ghost:
          "text-dark-400 hover:text-dark-200 hover:bg-dark-800 active:bg-dark-700",
        danger:
          "bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-[0_2px_8px_rgba(244,63,94,0.3)] hover:shadow-[0_4px_16px_rgba(244,63,94,0.4)] hover:-translate-y-[1px] active:translate-y-0",
        success:
          "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_16px_rgba(16,185,129,0.4)] hover:-translate-y-[1px] active:translate-y-0",
        outline:
          "border border-dark-600 text-dark-300 bg-transparent hover:bg-dark-800 hover:text-dark-100 hover:border-dark-500",
        long:
          "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_2px_8px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_12px_rgba(16,185,129,0.35)] active:shadow-[0_1px_4px_rgba(16,185,129,0.2)]",
        short:
          "bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-[0_2px_8px_rgba(244,63,94,0.25)] hover:shadow-[0_4px_12px_rgba(244,63,94,0.35)] active:shadow-[0_1px_4px_rgba(244,63,94,0.2)]",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-md",
        md: "h-9 px-4 text-sm rounded-[10px]",
        lg: "h-11 px-6 text-base rounded-lg",
        xl: "h-12 px-8 text-base rounded-lg",
        icon: "h-9 w-9 rounded-[10px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
