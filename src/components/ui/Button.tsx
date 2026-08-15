import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "accent" | "danger" | "outline" | "ghost" | "subtle";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-primary text-primary-foreground font-semibold shadow-glow-primary hover:brightness-110",
  accent:
    "bg-gradient-accent text-accent-foreground font-semibold shadow-glow-accent hover:brightness-110",
  danger:
    "bg-gradient-alert text-destructive-foreground font-semibold shadow-glow-alert hover:brightness-110",
  outline: "border border-border bg-transparent hover:bg-secondary/60",
  ghost: "bg-transparent hover:bg-secondary/60",
  subtle: "bg-secondary/70 hover:bg-secondary",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9.5 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({
  variant = "subtle",
  size = "md",
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg whitespace-nowrap transition-all",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
