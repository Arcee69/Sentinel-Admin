import { useId, useState } from "react";
import { useMeasure } from "../../hooks/useMeasure";

interface Props {
  labels: string[];
  values: number[];
  color?: string;
  height?: number;
  format?: (n: number) => string;
}

const PAD = { top: 14, right: 10, bottom: 18, left: 30 };

/**
 * Single-series line + area. One series, so no legend box — the panel
 * title names it. Hover gives a crosshair and a value readout.
 */
export function SparkArea({
  labels,
  values,
  color = "var(--color-chart-2)",
  height = 200,
  format = (n) => String(n),
}: Props) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const gradId = useId();

  const n = values.length;
  const w = Math.max(width, 300);
  const innerW = w - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const stepX = n > 1 ? innerW / (n - 1) : 0;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const lo = min - (max - min) * 0.6;
  const hi = max + (max - min) * 0.25;

  const xAt = (i: number) => PAD.left + i * stepX;
  const yAt = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * innerH;

  const line = values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" L ");
  const area = `M ${xAt(0)},${PAD.top + innerH} L ${line} L ${xAt(n - 1)},${PAD.top + innerH} Z`;

  const ticks = [lo + (hi - lo) * 0.15, lo + (hi - lo) * 0.55, lo + (hi - lo) * 0.95];

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.round((e.clientX - rect.left - PAD.left) / (stepX || 1));
    setActive(Math.max(0, Math.min(n - 1, i)));
  }

  return (
    <div
      ref={ref}
      className="relative"
      onMouseMove={handleMove}
      onMouseLeave={() => setActive(null)}
    >
      <svg
        width={w}
        height={height}
        role="img"
        aria-label={`Trend across ${n} periods, currently ${format(values[n - 1])}`}
        className="block"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Recessive gridlines */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={PAD.left + innerW}
              y1={yAt(t)}
              y2={yAt(t)}
              stroke="var(--color-border)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 6}
              y={yAt(t) + 3}
              textAnchor="end"
              className="fill-muted-foreground"
              style={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
            >
              {Math.round(t)}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gradId})`} />
        <path
          d={`M ${line}`}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle
          cx={xAt(n - 1)}
          cy={yAt(values[n - 1])}
          r="4"
          fill={color}
          stroke="var(--color-card)"
          strokeWidth="2"
        />

        {active !== null && (
          <>
            <line
              x1={xAt(active)}
              x2={xAt(active)}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="var(--color-muted-foreground)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle
              cx={xAt(active)}
              cy={yAt(values[active])}
              r="5"
              fill={color}
              stroke="var(--color-card)"
              strokeWidth="2"
            />
          </>
        )}

        {/* x labels: first, middle, last only — never a label on every point */}
        {[0, Math.floor((n - 1) / 2), n - 1].map((i) => (
          <text
            key={i}
            x={xAt(i)}
            y={height - 4}
            textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
            className="fill-muted-foreground"
            style={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
          >
            {labels[i]}
          </text>
        ))}
      </svg>

      {active !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md border border-border bg-popover px-2 py-1 shadow-elevated"
          style={{ left: xAt(active), top: 0 }}
        >
          <p className="font-mono text-[10px] text-muted-foreground">{labels[active]}</p>
          <p className="font-mono text-[12px] font-semibold tabular-nums">
            {format(values[active])}
          </p>
        </div>
      )}
    </div>
  );
}
