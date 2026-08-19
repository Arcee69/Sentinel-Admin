import { cn } from "../../lib/cn";
import type { Provenance } from "../../lib/participation";
import { ProvenanceTag } from "./Tags";

type Tone = "default" | "success" | "warning" | "danger";

const VALUE_TONE: Record<Tone, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

/**
 * Headline figure with its source attached. Unlike the generic `StatCard`,
 * provenance is part of the tile rather than a caption — a participation
 * number is not readable without knowing where it came from.
 */
export function ParticipationKpi({
  label,
  value,
  hint,
  provenance,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  provenance?: Provenance;
  tone?: Tone;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/80 p-3 shadow-card">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-mono text-2xl font-semibold tabular-nums", VALUE_TONE[tone])}>
        {value}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {provenance && <ProvenanceTag value={provenance} />}
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

/** Shown wherever a surface has nothing to render — never a zeroed-out figure. */
export function ParticipationEmpty({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-6 text-center">
      <p className="text-xs font-semibold text-muted-foreground">{message}</p>
      <p className="mt-1 text-[11px] text-muted-foreground/80">
        {hint ??
          "Sentinel does not invent figures. Load the INEC register baseline and capture agent reports to populate this surface."}
      </p>
    </div>
  );
}
