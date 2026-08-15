import { useId, useMemo, useRef, useState } from "react";
import { NG_STATE_SHAPES, NG_VIEWBOX } from "../../lib/nigeriaGeo";
import { LGAS_BY_STATE, type StateActivity } from "../../lib/data";
import { cn } from "../../lib/cn";

/**
 * Sequential ramp — one hue (245), monotonic dim→bright.
 * Magnitude is encoded as brightness against the dark surface, so the ramp
 * reads in one direction and never as separate categories.
 */
const RAMP = [
  "oklch(32% 0.06 245)",
  "oklch(42% 0.10 245)",
  "oklch(52% 0.14 245)",
  "oklch(60% 0.17 245)",
  "oklch(68% 0.19 245)",
];

interface Props {
  states: StateActivity[];
  /**
   * Full roster, drawn dimmed behind `states`. Without it a scoped map is a
   * lone sliver floating in an empty box — the country outline is what makes
   * the selection legible.
   */
  contextStates?: StateActivity[];
  onSelect?: (state: StateActivity) => void;
  selected?: string | null;
  className?: string;
}

export function NigeriaMap({
  states,
  contextStates,
  onSelect,
  selected,
  className,
}: Props) {
  const [hovered, setHovered] = useState<StateActivity | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const gradId = useId();

  // Join geometry to metrics by state code; skip shapes with no data.
  const { byCode, min, max } = useMemo(() => {
    const byCode = new Map(states.map((s) => [s.code, s]));
    const values = states.map((s) => s.activity);
    return { byCode, min: Math.min(...values), max: Math.max(...values) };
  }, [states]);

  const stepFor = (v: number) => {
    const t = max === min ? 1 : (v - min) / (max - min);
    return RAMP[Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))];
  };

  const topFive = useMemo(
    () => [...states].sort((a, b) => b.activity - a.activity).slice(0, 5),
    [states],
  );

  /** Shapes to draw as dim backdrop — everything in context but not in scope. */
  const outOfScope = useMemo(() => {
    if (!contextStates?.length) return [];
    const scoped = new Set(states.map((s) => s.code));
    const context = new Set(contextStates.map((s) => s.code));
    return NG_STATE_SHAPES.filter((sh) => context.has(sh.id) && !scoped.has(sh.id));
  }, [states, contextStates]);

  function handleMove(e: React.MouseEvent) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) setPointer({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <div className={className}>
      <div
        ref={wrapRef}
        onMouseMove={handleMove}
        className="relative overflow-hidden rounded-xl border border-border bg-gradient-surface bg-grid"
      >
        <svg
          viewBox={NG_VIEWBOX}
          // `meet` letterboxes the 1000×900 artboard into a fixed height, so the
          // panel stays a sane size instead of growing with its own width.
          preserveAspectRatio="xMidYMid meet"
          className="h-[320px] w-full sm:h-[400px] xl:h-[460px]"
          role="img"
          aria-label="Activity intensity across the 36 states and the Federal Capital Territory"
        >
          <defs>
            <radialGradient id={`${gradId}-glow`} cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="oklch(68% 0.19 245 / 0.18)" />
              <stop offset="100%" stopColor="oklch(68% 0.19 245 / 0)" />
            </radialGradient>
          </defs>

          <ellipse cx="500" cy="480" rx="480" ry="360" fill={`url(#${gradId}-glow)`} />

          {/* Out-of-scope states: shape only, no data encoding. */}
          {outOfScope.length > 0 && (
            <g pointerEvents="none">
              {outOfScope.map((shape) => (
                <path
                  key={`ctx-${shape.id}`}
                  d={shape.d}
                  fill="oklch(24% 0.02 252)"
                  stroke="oklch(16% 0.025 250 / 0.9)"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              ))}
            </g>
          )}

          <g>
            {NG_STATE_SHAPES.map((shape) => {
              const data = byCode.get(shape.id);
              if (!data) return null;

              const isHovered = hovered?.code === shape.id;
              const isSelected = selected === data.name;

              return (
                <path
                  key={shape.id}
                  d={shape.d}
                  fill={stepFor(data.activity)}
                  // A surface-coloured hairline keeps neighbouring fills from
                  // bleeding into one another.
                  stroke={
                    isHovered || isSelected
                      ? "oklch(96% 0.01 240)"
                      : "oklch(16% 0.025 250 / 0.9)"
                  }
                  strokeWidth={isHovered || isSelected ? 2.2 : 1}
                  strokeLinejoin="round"
                  className="cursor-pointer transition-[stroke,stroke-width,filter] duration-150"
                  style={{
                    filter: isHovered ? "brightness(1.25)" : undefined,
                  }}
                  onMouseEnter={() => setHovered(data)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSelect?.(data)}
                >
                  <title>{`${data.name} — activity ${data.activity}, ${data.reports} reports`}</title>
                </path>
              );
            })}
          </g>

          {/* Codes for the larger states; small ones would collide, and the
              hover card names every state anyway. */}
          <g pointerEvents="none">
            {NG_STATE_SHAPES.map((shape) => {
              const data = byCode.get(shape.id);
              if (!data || shape.d.length < 1500) return null;
              return (
                <text
                  key={shape.id}
                  x={shape.cx}
                  y={shape.cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                    fill: "oklch(96% 0.01 240 / 0.75)",
                  }}
                >
                  {shape.id}
                </text>
              );
            })}
          </g>
        </svg>

        {/* Hover card — identity is never colour-alone. */}
        {hovered && (
          <div
            className="pointer-events-none absolute z-10 min-w-44 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-lg border border-border bg-popover px-3 py-2 shadow-elevated"
            style={{ left: pointer.x, top: pointer.y }}
          >
            <p className="text-[12px] font-semibold">{hovered.name}</p>
            <dl className="mt-1 space-y-0.5">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Activity
                </dt>
                <dd className="font-mono text-[11px] font-semibold tabular-nums">
                  {hovered.activity}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Reports
                </dt>
                <dd className="font-mono text-[11px] font-semibold tabular-nums">
                  {hovered.reports}
                </dd>
              </div>
              {LGAS_BY_STATE[hovered.name] && (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    LGAs
                  </dt>
                  <dd className="font-mono text-[11px] font-semibold tabular-nums">
                    {LGAS_BY_STATE[hovered.name].length}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

      {/* Legend + top-state readout */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Activity intensity
          </span>
          <span className="text-[10px] text-muted-foreground">Low</span>
          <div className="flex gap-0.5">
            {RAMP.map((c) => (
              <span key={c} className="h-2.5 w-5 rounded-sm" style={{ background: c }} />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">High</span>
        </div>

        <p
          className={cn(
            "font-mono text-[11px] tabular-nums",
            hovered ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {hovered
            ? `${hovered.name} · activity ${hovered.activity} · ${hovered.reports} reports`
            : "Hover a state for detail · click to drill into LGA → Ward"}
        </p>
      </div>

      {/* Area is not magnitude: Lagos and the FCT lead the country but are almost
          invisible on the map. This ranked row keeps the leaders readable. */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          Most active
        </span>
        {topFive.map((s, i) => (
          <button
            key={s.code}
            onClick={() => onSelect?.(s)}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(null)}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 transition-colors",
              hovered?.code === s.code
                ? "border-primary/50 bg-primary/10"
                : "border-border bg-secondary/30 hover:border-primary/30",
            )}
          >
            <span className="font-mono text-[9px] text-muted-foreground">{i + 1}</span>
            <span
              className="h-2 w-2 rounded-sm"
              style={{ background: stepFor(s.activity) }}
              aria-hidden
            />
            <span className="text-[11px] font-medium">{s.name}</span>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {s.activity}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
