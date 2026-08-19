import { cn } from "../../lib/cn";
import {
  PROVENANCE_LABELS,
  titleCase,
  type Confidence,
  type Provenance,
} from "../../lib/participation";

const TAG = "rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider";
const PILL = "rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider";

const PROVENANCE_TONE: Record<Provenance, string> = {
  inec_official: "border-primary/50 bg-primary/10 text-primary",
  sentinel_observed: "border-success/40 bg-success/10 text-success",
  sentinel_estimated: "border-warning/40 bg-warning/10 text-warning",
  unverified: "border-border bg-muted/30 text-muted-foreground",
};

/**
 * Where a number came from. Every participation figure carries one — an
 * observed figure must never be mistaken for an official INEC result.
 */
export function ProvenanceTag({ value }: { value: Provenance }) {
  return <span className={cn(TAG, PROVENANCE_TONE[value])}>{PROVENANCE_LABELS[value]}</span>;
}

const BAND_TONE = {
  high: "border-success/40 bg-success/10 text-success",
  good: "border-primary/40 bg-primary/10 text-primary",
  moderate: "border-warning/40 bg-warning/10 text-warning",
  low: "border-destructive/40 bg-destructive/10 text-destructive",
} as const;

export function ConfidencePill({ value }: { value: Confidence }) {
  const p = value.parts;
  return (
    <span
      className={cn(PILL, "tabular-nums", BAND_TONE[value.band])}
      title={
        `Coverage ${p.coverage.toFixed(0)} · Verification ${p.verification.toFixed(0)} · ` +
        `Completeness ${p.completeness.toFixed(0)} · Source ${p.reliability.toFixed(0)} · ` +
        `Consistency ${p.consistency.toFixed(0)} — data reliability, not political certainty`
      }
    >
      {value.band} · {value.score}
    </span>
  );
}

export type PillTone = "primary" | "success" | "warning" | "destructive" | "muted";

const PILL_TONE: Record<PillTone, string> = {
  primary: "border-primary/40 bg-primary/10 text-primary",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  destructive: "border-destructive/40 bg-destructive/10 text-destructive",
  muted: "border-border bg-muted/30 text-muted-foreground",
};

/** Snake-cased record statuses, rendered as words. */
export function StatusPill({ value, tone = "muted" }: { value?: string; tone?: PillTone }) {
  return <span className={cn(PILL, PILL_TONE[tone])}>{titleCase(value) || "—"}</span>;
}

/**
 * A percentage-point difference. Signed and coloured, because the direction
 * against the historical benchmark is the whole point of the number.
 */
export function DeltaValue({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "tabular-nums",
        value > 0 ? "text-success" : value < 0 ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {value > 0 ? "+" : ""}
      {value.toFixed(2)} pp
    </span>
  );
}
