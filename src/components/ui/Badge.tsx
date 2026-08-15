import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export type BadgeTone =
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "muted";

const TONES: Record<BadgeTone, string> = {
  primary: "border-primary/35 bg-primary/12 text-primary",
  accent: "border-accent/35 bg-accent/12 text-accent",
  success: "border-success/35 bg-success/12 text-success",
  warning: "border-warning/35 bg-warning/12 text-warning",
  destructive: "border-destructive/40 bg-destructive/12 text-destructive",
  info: "border-info/35 bg-info/12 text-info",
  muted: "border-border bg-muted/50 text-muted-foreground",
};

export function Badge({
  tone = "muted",
  children,
  className,
  dot = false,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
