import type { ButtonHTMLAttributes } from "react";

import { cn } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly loading?: boolean;
  readonly loadingText?: string;
  readonly size?: ButtonSize;
  readonly variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-[0_8px_24px_-10px_color-mix(in_oklab,var(--primary)_70%,transparent)] hover:bg-primary-hover",
  secondary: "bg-accent text-accent-foreground shadow-sm hover:bg-accent/80",
  outline: "border border-border bg-card text-foreground shadow-sm hover:border-primary/30 hover:bg-primary-soft",
  ghost: "text-foreground hover:bg-muted",
  destructive: "bg-destructive text-white shadow-sm hover:opacity-90",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 rounded-lg px-3 text-xs",
  md: "h-11 rounded-xl px-5 text-sm",
  lg: "h-12 rounded-xl px-6 text-sm",
  icon: "h-11 w-11 rounded-xl",
};

export function Button({ children, className, disabled, loading = false, loadingText, size = "md", type = "button", variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : null}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}
