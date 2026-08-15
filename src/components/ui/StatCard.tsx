import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import type { Trend } from "../../lib/data";

const TONES = {
  primary: { ring: "bg-primary/12 text-primary", bar: "bg-primary" },
  accent: { ring: "bg-accent/12 text-accent", bar: "bg-accent" },
  warning: { ring: "bg-warning/12 text-warning", bar: "bg-warning" },
  info: { ring: "bg-info/12 text-info", bar: "bg-info" },
} as const;

export type StatTone = keyof typeof TONES;

interface Props {
  label: string;
  value: string;
  delta?: string;
  trend?: Trend;
  caption?: string;
  icon?: ReactNode;
  tone?: StatTone;
  className?: string;
}

/**
 * A headline number. No plot — the number is the whole message, so per the
 * dataviz form heuristic this stays a stat tile rather than a chart.
 */
export function StatCard({
  label,
  value,
  delta,
  trend = "up",
  caption,
  icon,
  tone = "primary",
  className,
}: Props) {
  const t = TONES[tone];
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card/80 p-4 shadow-card transition-colors hover:border-primary/30",
        className,
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-px opacity-60", t.bar)} />

      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {icon && (
          <span className={cn("grid h-8 w-8 place-items-center rounded-lg", t.ring)}>
            {icon}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums sm:text-[28px]">
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-semibold",
              trend === "up" ? "text-success" : "text-destructive",
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {delta}
          </span>
        )}
      </div>

      {caption && <p className="mt-1 text-[11px] text-muted-foreground">{caption}</p>}
    </div>
  );
}
