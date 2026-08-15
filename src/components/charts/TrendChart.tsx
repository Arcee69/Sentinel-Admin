import { useId, useState } from "react";
import { useMeasure } from "../../hooks/useMeasure";

export interface TrendSeries {
  key: string;
  label: string;
  /** CSS colour — a validated categorical step. */
  color: string;
  values: number[];
  format: (n: number) => string;
  /** Axis unit shown under the panel label. */
  unit?: string;
}

interface Props {
  labels: string[];
  series: TrendSeries[];
  /** Height of each stacked panel. */
  panelHeight?: number;
}

const PAD = { top: 12, right: 52, bottom: 4, left: 46 };

/**
 * Small multiples with a linked crosshair.
 *
 * The three measures live on different scales (reach in thousands, engagement
 * in percent, shares in counts), so they get one panel each rather than a
 * second y-axis — a dual-axis chart would make their crossings meaningless.
 * One shared x-axis and one shared hover index keep them comparable.
 */
export function TrendChart({ labels, series, panelHeight = 92 }: Props) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const gradId = useId();

  const n = labels.length;
  const w = Math.max(width, 320);
  const innerW = w - PAD.left - PAD.right;
  const stepX = n > 1 ? innerW / (n - 1) : 0;
  const xAt = (i: number) => PAD.left + i * stepX;

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - PAD.left;
    const i = Math.round(x / (stepX || 1));
    setActive(Math.max(0, Math.min(n - 1, i)));
  }

  return (
    <div>
      {/* Legend — always present for ≥2 series; each panel is also direct-labelled. */}
      {series.length > 1 && (
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {series.map((s) => (
            <li key={s.key} className="inline-flex items-center gap-1.5 text-[11px]">
              <span
                className="h-0.5 w-4 rounded-full"
                style={{ background: s.color }}
                aria-hidden
              />
              <span className="text-muted-foreground">{s.label}</span>
            </li>
          ))}
        </ul>
      )}

      <div
        ref={ref}
        className="relative"
        onMouseMove={handleMove}
        onMouseLeave={() => setActive(null)}
      >
        {series.map((s) => {
          const max = Math.max(...s.values);
          const min = Math.min(...s.values);
          const lo = Math.max(0, min - (max - min) * 0.35);
          const hi = max + (max - min) * 0.12;
          const h = panelHeight;
          const innerH = h - PAD.top - PAD.bottom;
          const yAt = (v: number) =>
            PAD.top + (1 - (v - lo) / (hi - lo || 1)) * innerH;

          const line = s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" L ");
          const area = `M ${xAt(0)},${PAD.top + innerH} L ${line} L ${xAt(n - 1)},${PAD.top + innerH} Z`;
          const last = s.values[s.values.length - 1];

          return (
            <div key={s.key} className="border-b border-border/60 py-1 last:border-b-0">
              <svg
                width={w}
                height={h}
                role="img"
                aria-label={`${s.label} over ${n} periods, ending at ${s.format(last)}`}
                className="block overflow-visible"
              >
                <defs>
                  <linearGradient id={`${gradId}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Recessive baseline */}
                <line
                  x1={PAD.left}
                  x2={PAD.left + innerW}
                  y1={PAD.top + innerH}
                  y2={PAD.top + innerH}
                  stroke="var(--color-border)"
                  strokeWidth="1"
                />

                <path d={area} fill={`url(#${gradId}-${s.key})`} />
                <path
                  d={`M ${line}`}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Panel label (left) and current value (right) — direct labels,
                    so identity never rests on colour alone. */}
                <text
                  x={0}
                  y={PAD.top + 4}
                  className="fill-muted-foreground"
                  style={{ fontSize: 10, fontWeight: 600 }}
                >
                  {s.label}
                </text>
                {s.unit && (
                  <text x={0} y={PAD.top + 16} className="fill-muted-foreground" style={{ fontSize: 9 }}>
                    {s.unit}
                  </text>
                )}

                <text
                  x={w - PAD.right + 8}
                  y={yAt(last) + 3}
                  className="fill-foreground"
                  style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono)" }}
                >
                  {s.format(active !== null ? s.values[active] : last)}
                </text>

                {/* End marker, ringed in the surface colour so it reads on the line */}
                <circle
                  cx={xAt(n - 1)}
                  cy={yAt(last)}
                  r="4"
                  fill={s.color}
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
                      cy={yAt(s.values[active])}
                      r="4.5"
                      fill={s.color}
                      stroke="var(--color-card)"
                      strokeWidth="2"
                    />
                  </>
                )}
              </svg>
            </div>
          );
        })}

        {/* Shared x-axis */}
        <div
          className="mt-1 flex justify-between font-mono text-[9px] text-muted-foreground"
          style={{ paddingLeft: PAD.left, paddingRight: PAD.right }}
        >
          {labels.map((l, i) => (
            <span
              key={l}
              className={i === active ? "font-semibold text-foreground" : undefined}
            >
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
