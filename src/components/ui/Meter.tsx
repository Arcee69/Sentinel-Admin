import { cn } from "../../lib/cn";

/**
 * Single-value magnitude bar. 4px rounded data-end anchored to a track,
 * per the dataviz mark spec.
 */
export function Meter({
  value,
  max = 100,
  className,
  barClassName,
  color,
  height = "h-1.5",
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  /** Explicit CSS color for the fill; wins over `barClassName`. */
  color?: string;
  height?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-muted/70", height, className)}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700",
          !color && (barClassName ?? "bg-primary"),
        )}
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
