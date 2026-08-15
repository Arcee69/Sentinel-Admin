import { useState } from "react";
import { cn } from "../../lib/cn";
import { LGAS_BY_STATE, type StateActivity } from "../../lib/data";

/**
 * Sequential ramp — one hue (245), monotonic light→bright for magnitude.
 * On a dark surface the low end is the dim step, so intensity reads as brightness.
 */
const RAMP = [
  "oklch(30% 0.06 245)",
  "oklch(40% 0.10 245)",
  "oklch(50% 0.14 245)",
  "oklch(58% 0.17 245)",
  "oklch(66% 0.19 245)",
];

function stepFor(value: number, min: number, max: number) {
  const t = max === min ? 1 : (value - min) / (max - min);
  return RAMP[Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))];
}

interface Props {
  states: StateActivity[];
  /** Show the per-cell report count under the label. */
  showReports?: boolean;
  onSelect?: (state: StateActivity) => void;
  selected?: string | null;
}

export function StateHeatmap({ states, showReports = false, onSelect, selected }: Props) {
  const [hovered, setHovered] = useState<StateActivity | null>(null);

  const values = states.map((s) => s.activity);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
        {states.map((s) => {
          const isSelected = selected === s.name;
          return (
            <button
              key={s.code}
              onClick={() => onSelect?.(s)}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(s)}
              onBlur={() => setHovered(null)}
              title={`${s.name} · activity ${s.activity} · ${s.reports} reports`}
              className={cn(
                "group relative cursor-pointer rounded-lg border p-2 text-left transition-all",
                // 2px surface ring keeps adjacent fills from touching
                "border-transparent ring-2 ring-card hover:-translate-y-0.5 hover:border-foreground/30",
                isSelected && "border-foreground/60",
              )}
              style={{ background: stepFor(s.activity, min, max) }}
            >
              <span className="block font-mono text-[10px] font-semibold text-foreground/90">
                {s.code}
              </span>
              <span className="mt-0.5 block truncate text-[10px] leading-tight text-foreground/75">
                {s.name}
              </span>
              {showReports && (
                <span className="mt-1 block font-mono text-[9px] tabular-nums text-foreground/60">
                  {s.reports} rpts
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend + readout. Identity is never color-alone: the tooltip names the state. */}
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

        <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {hovered ? (
            <>
              <span className="text-foreground">{hovered.name}</span> · activity{" "}
              {hovered.activity} · {hovered.reports} reports
              {LGAS_BY_STATE[hovered.name] &&
                ` · ${LGAS_BY_STATE[hovered.name].length} LGAs`}
            </>
          ) : (
            "Hover a state for detail"
          )}
        </p>
      </div>
    </div>
  );
}
