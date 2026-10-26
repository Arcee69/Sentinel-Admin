/**
 * Voter participation intelligence — INEC register baseline as the anchor,
 * Sentinel polling-unit observation as the signal.
 *
 * The two are deliberately never merged. Registered-voter figures come from a
 * versioned register baseline that field agents cannot edit; everything an
 * agent reports is a separate observation carrying its own verification state.
 * A mismatch between the two raises a discrepancy rather than overwriting the
 * baseline, which is why every surfaced number carries a provenance tag.
 *
 * This module holds the shared vocabulary, formatters and confidence scoring.
 * The figures come from the API — see `lib/participationApi.ts` and
 * `hooks/api/useParticipation.ts`.
 */

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

export type Provenance =
  | "inec_official"
  | "sentinel_observed"
  | "sentinel_estimated"
  | "unverified";

export const PROVENANCE_LABELS: Record<Provenance, string> = {
  inec_official: "INEC OFFICIAL",
  sentinel_observed: "SENTINEL OBSERVED",
  sentinel_estimated: "SENTINEL ESTIMATED",
  unverified: "UNVERIFIED",
};

export type AnomalyStatus = "open" | "reviewing" | "confirmed" | "dismissed";

/** Queue transitions an analyst can apply to an anomaly. */
export const ANOMALY_STATUSES: AnomalyStatus[] = ["open", "reviewing", "confirmed", "dismissed"];

/** Layers the turnout choropleth can shade by. */
export const MAP_LAYERS = [
  { key: "registered", label: "Registered" },
  { key: "coverage", label: "Coverage" },
  { key: "accreditation", label: "Accreditation" },
  { key: "participation", label: "Participation" },
  { key: "turnout", label: "Turnout" },
  { key: "historical_difference", label: "Historical Difference" },
  { key: "verification", label: "Verification" },
  { key: "anomaly", label: "Anomaly" },
] as const;

export type MapLayer = (typeof MAP_LAYERS)[number]["key"];

/** Election years the historical benchmark is drawn from, newest first. */
export const HISTORICAL_YEARS = [2023, 2019, 2015] as const;

/** Standing disclaimers. Rendered on every participation surface. */
export const PARTICIPATION_NOTES = {
  provenance:
    "Sentinel observed turnout is field-observed data. It is never a substitute for INEC official results and is always labelled.",
  baseline:
    "Registered-voter figures come from the official INEC register baseline. Agents cannot edit them; a mismatch creates a discrepancy record.",
  confidence:
    "Confidence describes data reliability (coverage, verification, completeness, source, consistency) — not political certainty.",
} as const;

/** Sub-surfaces of the participation section, in sub-nav order. */
export const PARTICIPATION_TABS = [
  { to: "/participation", label: "National" },
  { to: "/participation/geography", label: "State · LGA · Ward" },
  { to: "/participation/polling-units", label: "Polling Units" },
  { to: "/participation/register", label: "Register & Reconciliation" },
  { to: "/participation/historical", label: "Historical" },
  { to: "/participation/anomalies", label: "Anomalies" },
  { to: "/participation/map", label: "Turnout Map" },
  { to: "/participation/live", label: "Live Monitor" },
] as const;

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export function titleCase(value: string | undefined | null): string {
  return value ? value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";
}

export function formatCount(n: number | null | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? n.toLocaleString("en-US") : "—";
}

export function formatPercent(n: number | null | undefined, digits = 1): string {
  return typeof n === "number" && Number.isFinite(n) ? `${n.toFixed(digits)}%` : "—";
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

/** Discrepancy / verification words mapped onto the badge palette. */
export function statusTone(
  status: string | undefined,
): "primary" | "success" | "warning" | "destructive" | "muted" {
  if (status === "verified" || status === "peer_reviewed") return "primary";
  if (status === "matched" || status === "resolved_inec_correct") return "success";
  if (status === "minor_difference" || status === "reviewing") return "warning";
  if (status === "material_difference" || status === "rejected") return "destructive";
  return "muted";
}

/* ------------------------------------------------------------------ */
/* Confidence                                                          */
/* ------------------------------------------------------------------ */

export type ConfidenceBand = "high" | "good" | "moderate" | "low";

export interface Confidence {
  score: number;
  band: ConfidenceBand;
  parts: {
    coverage: number;
    verification: number;
    completeness: number;
    reliability: number;
    consistency: number;
  };
}

/**
 * Data-reliability score, not political certainty. Coverage dominates because
 * an unreported polling unit is the one gap no amount of verification closes.
 */
export function scoreConfidence(input: {
  voterCoverage: number | null;
  verifiedReports: number;
  totalReports: number;
  completeFields: number;
  expectedFields: number;
  registerVerifiedShare: number;
  anomalies: number;
}): Confidence {
  const coverage = Math.max(0, Math.min(100, input.voterCoverage ?? 0));
  const verification = input.totalReports
    ? (input.verifiedReports / input.totalReports) * 100
    : 0;
  const completeness = input.expectedFields
    ? (input.completeFields / input.expectedFields) * 100
    : 0;
  const reliability = Math.max(0, Math.min(100, input.registerVerifiedShare * 100));
  const consistency = input.totalReports
    ? Math.max(0, 100 - (input.anomalies / input.totalReports) * 100)
    : 0;

  const score = Math.round(
    coverage * 0.3 +
      verification * 0.25 +
      completeness * 0.2 +
      reliability * 0.15 +
      consistency * 0.1,
  );

  const band: ConfidenceBand =
    score >= 80 ? "high" : score >= 60 ? "good" : score >= 35 ? "moderate" : "low";

  return { score, band, parts: { coverage, verification, completeness, reliability, consistency } };
}

/* ------------------------------------------------------------------ */
/* Level summaries                                                     */
/* ------------------------------------------------------------------ */

export interface LevelMetrics {
  accreditationRate: number | null;
  participationRate: number | null;
  validVoteRate: number | null;
  invalidVoteRate: number | null;
  puCoverage: number | null;
  voterCoverage: number | null;
}

export interface LevelSummary {
  key: string;
  label: string;
  state?: string;
  lga?: string;
  ward?: string;
  totalPus: number;
  coveredPus: number;
  registered: number;
  /** Registered voters inside reporting polling units only. */
  coveredRegistered: number;
  accredited: number;
  participating: number;
  valid: number;
  invalid: number;
  verifiedReports: number;
  unverifiedReports: number;
  anomalies: number;
  lastReportAt: string | null;
  metrics: LevelMetrics;
  historicalTurnout: number | null;
  /** Observed turnout minus historical benchmark, in percentage points. */
  historicalDelta: number | null;
  confidence: Confidence;
}

const rate = (part: number, whole: number): number | null =>
  whole > 0 ? (part / whole) * 100 : null;

/** Single-unit rates, for tables that show one polling unit rather than a level. */
export const accreditationRateOf = (accredited: number, registered: number) =>
  rate(accredited, registered);
export const participationRateOf = (participating: number, registered: number) =>
  rate(participating, registered);

/**
 * How far apart a field figure and the baseline are. Anything past 2% is
 * material — big enough that one of the two is wrong rather than miscounted.
 */
export function reconciliationLabel(difference: number, baseline: number): string {
  if (baseline <= 0) return "requires_review";
  if (difference === 0) return "matched";
  return Math.abs(difference) / baseline > 0.02 ? "material_difference" : "minor_difference";
}
