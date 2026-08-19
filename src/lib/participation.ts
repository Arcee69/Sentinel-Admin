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
 * There is no participation API yet, so `loadParticipationDataset` synthesises
 * a deterministic seed the same way the rest of `lib/` does — same version id
 * always yields the same dataset. Swap that one function for a request and the
 * aggregation below is unchanged.
 */

import { STATE_ACTIVITY } from "./states";

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

export type VerificationStatus =
  | "pending_review"
  | "verified"
  | "peer_reviewed"
  | "rejected";

export type AnomalySeverity = "low" | "medium" | "high" | "critical";

export type AnomalyType =
  | "turnout_above_registered"
  | "accredited_above_registered"
  | "participating_above_accredited"
  | "votes_inconsistent_with_participating"
  | "duplicate_agent_report"
  | "duplicate_pu_report"
  | "impossible_timestamp"
  | "missing_polling_unit"
  | "unexpected_register_change"
  | "material_reconciliation_difference";

export const ANOMALY_LABELS: Record<AnomalyType, string> = {
  turnout_above_registered: "Turnout above registered voters",
  accredited_above_registered: "Accredited above registered",
  participating_above_accredited: "Participating above accredited",
  votes_inconsistent_with_participating: "Valid + invalid inconsistent with participating",
  duplicate_agent_report: "Duplicate agent report",
  duplicate_pu_report: "Duplicate polling unit report",
  impossible_timestamp: "Impossible timestamp",
  missing_polling_unit: "Polling unit has not reported",
  unexpected_register_change: "Unexpected register change",
  material_reconciliation_difference: "Material reconciliation difference",
};

export type AnomalyStatus = "open" | "reviewing" | "confirmed" | "dismissed";

/** Queue transitions an analyst can apply to an anomaly. */
export const ANOMALY_STATUSES: AnomalyStatus[] = ["open", "reviewing", "confirmed", "dismissed"];

export type DiscrepancyStatus =
  | "open"
  | "reviewing"
  | "resolved_inec_correct"
  | "resolved_register_updated"
  | "dismissed";

export const DISCREPANCY_STATUSES: DiscrepancyStatus[] = [
  "open",
  "reviewing",
  "resolved_inec_correct",
  "resolved_register_updated",
  "dismissed",
];

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

/**
 * Participation permissions are their own vocabulary because the section
 * distinguishes who may *observe* a figure from who may *verify* one.
 */
export type ParticipationRole =
  | "national_admin"
  | "state_coordinator"
  | "analyst"
  | "field_agent"
  | "observer";

/** Map the session's display role onto the participation vocabulary. */
export function participationRole(role: string | undefined): ParticipationRole {
  const r = (role ?? "").toLowerCase();
  if (r.includes("national")) return "national_admin";
  if (r.includes("coordinator") || r.includes("state")) return "state_coordinator";
  if (r.includes("analyst")) return "analyst";
  if (r.includes("observer") || r.includes("auditor") || r.includes("guest")) return "observer";
  return "field_agent";
}

/** Everyone but an observer may capture a field report. */
export function canWrite(role: string | undefined): boolean {
  return participationRole(role) !== "observer";
}

/** Verification and reconciliation are a supervisory action. */
export function canVerify(role: string | undefined): boolean {
  const r = participationRole(role);
  return r === "national_admin" || r === "state_coordinator";
}

/** Locking a register version is national-admin only. */
export function canLockRegister(role: string | undefined): boolean {
  return participationRole(role) === "national_admin";
}

/* ------------------------------------------------------------------ */
/* Records                                                             */
/* ------------------------------------------------------------------ */

export type RegisterKind = "certified" | "provisional" | "cvr_update" | "final";

/** A register version is `disputed` when a baseline is contested, not rejected. */
export type RegisterStatus = VerificationStatus | "disputed";

export interface RegisterVersion {
  id: string;
  code: string;
  label: string;
  register_year: number;
  kind: RegisterKind;
  source: string;
  verification_status: RegisterStatus;
  is_locked: boolean;
}

export interface TurnoutReport {
  id: string;
  polling_unit_id: string;
  register_version_id: string | null;
  /** The baseline the agent was shown — copied at submission, never edited. */
  baseline_registered_voters: number | null;
  /** What the polling unit actually displayed, if the agent confirmed it. */
  registered_voters_displayed: number | null;
  accredited_voters: number | null;
  participating_voters: number | null;
  valid_votes: number | null;
  invalid_votes: number | null;
  result_observations: string | null;
  incident_note: string | null;
  verification_status: VerificationStatus;
  is_duplicate: boolean;
  validation_flags: string[];
  reported_by: string;
  reported_at: string;
}

export interface TurnoutAnomaly {
  id: string;
  polling_unit_id: string | null;
  anomaly_type: AnomalyType;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  detail: string;
  detected_at: string;
}

/**
 * A field figure that disagrees with the baseline. Raised, never applied — the
 * INEC register is only changed by importing a new version.
 */
export interface RegisterDiscrepancy {
  id: string;
  polling_unit_id: string;
  register_version_id: string | null;
  turnout_report_id: string | null;
  inec_registered_voters: number;
  reported_registered_voters: number;
  difference: number;
  severity: "minor" | "material";
  note: string | null;
  status: DiscrepancyStatus;
  created_at: string;
}

export interface HistoricalTurnout {
  level: "national" | "state" | "lga" | "ward" | "polling_unit";
  state?: string;
  lga?: string;
  ward?: string;
  inec_pu_id?: string;
  election_year: number;
  turnout_percentage: number;
}

/** One polling unit joined to its register baseline and its reports. */
export interface PuRow {
  id: string;
  inec_pu_id: string;
  name: string;
  state: string;
  lga: string;
  ward: string;
  /** From the INEC baseline for the active register version. Never agent-set. */
  registered: number | null;
  registerVerified: boolean;
  registerVersionId: string | null;
  reports: TurnoutReport[];
  /** The single report the aggregation trusts — best verification, then newest. */
  report: TurnoutReport | null;
  anomalies: number;
}

export interface ParticipationDataset {
  versions: RegisterVersion[];
  activeVersionId: string | null;
  rows: PuRow[];
  historical: HistoricalTurnout[];
  discrepancies: RegisterDiscrepancy[];
  anomalies: TurnoutAnomaly[];
  reportCount: number;
}

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
function scoreConfidence(input: {
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
/* Aggregation                                                         */
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

/** Best available report for a polling unit: verification first, then recency. */
export function pickReport(reports: TurnoutReport[]): TurnoutReport | null {
  if (!reports.length) return null;
  const rank = (r: TurnoutReport) =>
    r.verification_status === "peer_reviewed"
      ? 0
      : r.verification_status === "verified"
        ? 1
        : r.verification_status === "pending_review"
          ? 2
          : 4;
  return [...reports].sort(
    (a, b) => rank(a) - rank(b) || +new Date(b.reported_at) - +new Date(a.reported_at),
  )[0];
}

/**
 * Roll a set of polling units into one level.
 *
 * Rates are taken against *total* registered voters, not just the reporting
 * ones, so an under-covered level reads as low turnout rather than borrowing
 * the confidence of the units that did report. `voterCoverage` is what tells
 * the two apart.
 */
function aggregate(
  rows: PuRow[],
  meta: {
    key: string;
    label: string;
    state?: string;
    lga?: string;
    ward?: string;
    historicalTurnout?: number | null;
  },
): LevelSummary {
  let registered = 0;
  let coveredRegistered = 0;
  let coveredPus = 0;
  let accredited = 0;
  let participating = 0;
  let valid = 0;
  let invalid = 0;
  let verifiedReports = 0;
  let unverifiedReports = 0;
  let completeFields = 0;
  let expectedFields = 0;
  let registerVerified = 0;
  let anomalies = 0;
  let totalReports = 0;
  let lastReportAt: string | null = null;

  for (const row of rows) {
    registered += row.registered ?? 0;
    if (row.registerVerified) registerVerified += 1;
    anomalies += row.anomalies;
    totalReports += row.reports.length;

    for (const r of row.reports) {
      if (r.verification_status === "verified" || r.verification_status === "peer_reviewed") {
        verifiedReports += 1;
      } else if (r.verification_status !== "rejected") {
        unverifiedReports += 1;
      }
      if (!lastReportAt || r.reported_at > lastReportAt) lastReportAt = r.reported_at;
    }

    const report = row.report;
    if (report && report.verification_status !== "rejected") {
      coveredPus += 1;
      coveredRegistered += row.registered ?? 0;
      accredited += report.accredited_voters ?? 0;
      participating += report.participating_voters ?? 0;
      valid += report.valid_votes ?? 0;
      invalid += report.invalid_votes ?? 0;

      const fields = [
        report.accredited_voters,
        report.participating_voters,
        report.valid_votes,
        report.invalid_votes,
      ];
      expectedFields += fields.length;
      completeFields += fields.filter((f) => typeof f === "number").length;
    }
  }

  const voterCoverage = rate(coveredRegistered, registered);
  const metrics: LevelMetrics = {
    accreditationRate: rate(accredited, registered),
    participationRate: rate(participating, registered),
    validVoteRate: rate(valid, registered),
    invalidVoteRate: rate(invalid, participating),
    puCoverage: rate(coveredPus, rows.length),
    voterCoverage,
  };

  const historicalTurnout = meta.historicalTurnout ?? null;
  const observed = metrics.participationRate;

  return {
    key: meta.key,
    label: meta.label,
    state: meta.state,
    lga: meta.lga,
    ward: meta.ward,
    totalPus: rows.length,
    coveredPus,
    registered,
    coveredRegistered,
    accredited,
    participating,
    valid,
    invalid,
    verifiedReports,
    unverifiedReports,
    anomalies,
    lastReportAt,
    metrics,
    historicalTurnout,
    historicalDelta:
      historicalTurnout != null && observed != null
        ? +(observed - historicalTurnout).toFixed(2)
        : null,
    confidence: scoreConfidence({
      voterCoverage,
      verifiedReports,
      totalReports,
      completeFields,
      expectedFields,
      registerVerifiedShare: rows.length ? registerVerified / rows.length : 0,
      anomalies,
    }),
  };
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = out.get(k);
    if (bucket) bucket.push(item);
    else out.set(k, [item]);
  }
  return out;
}

/** Historical rows are keyed by a normalised geography path. */
export const geoKey = (...parts: (string | undefined)[]) =>
  parts.filter(Boolean).join(" › ").toLowerCase();

export function indexHistorical(rows: HistoricalTurnout[]): Map<string, Map<number, number>> {
  const byLevel = new Map<string, Map<number, number>>();
  for (const r of rows) {
    if (r.turnout_percentage == null) continue;
    const key =
      r.level === "national"
        ? "national"
        : r.level === "state"
          ? geoKey(r.state)
          : r.level === "lga"
            ? geoKey(r.state, r.lga)
            : r.level === "ward"
              ? geoKey(r.state, r.lga, r.ward)
              : geoKey(r.inec_pu_id);
    const years = byLevel.get(key) ?? new Map<number, number>();
    years.set(r.election_year, Number(r.turnout_percentage));
    byLevel.set(key, years);
  }
  return byLevel;
}

/** Most recent election first; the mean is the fallback when it is missing. */
export function benchmark(
  index: Map<string, Map<number, number>>,
  key: string,
): { latest: number | null; average: number | null; years: Record<number, number> } {
  const years = index.get(key);
  if (!years?.size) return { latest: null, average: null, years: {} };
  const newest = [...years.keys()].sort((a, b) => b - a)[0];
  const values = [...years.values()];
  return {
    latest: years.get(newest) ?? null,
    average: +(values.reduce((t, v) => t + v, 0) / values.length).toFixed(2),
    years: Object.fromEntries(years.entries()),
  };
}

export function nationalSummary(data: ParticipationDataset): LevelSummary {
  const hist = benchmark(indexHistorical(data.historical), "national");
  return aggregate(data.rows, {
    key: "national",
    label: "Nigeria",
    historicalTurnout: hist.latest ?? hist.average,
  });
}

/**
 * Group a set of polling units into level rows, largest register first.
 *
 * Every tier goes through here so a state total is always exactly the sum of
 * its LGAs, and an LGA of its wards — the drill-down can never contradict the
 * level above it.
 */
function levelRows(
  data: ParticipationDataset,
  rows: PuRow[],
  key: (row: PuRow) => string,
  label: (row: PuRow) => string,
  meta: (row: PuRow) => { state?: string; lga?: string; ward?: string },
  histKey: (row: PuRow) => string,
): LevelSummary[] {
  const index = indexHistorical(data.historical);
  const out: LevelSummary[] = [];

  for (const [k, group] of groupBy(rows, key)) {
    const first = group[0];
    const hist = benchmark(index, histKey(first));
    out.push(
      aggregate(group, {
        key: k,
        label: label(first),
        ...meta(first),
        historicalTurnout: hist.latest ?? hist.average,
      }),
    );
  }

  return out.sort((a, b) => b.registered - a.registered);
}

/** One row per state. */
export function stateRows(data: ParticipationDataset): LevelSummary[] {
  return levelRows(
    data,
    data.rows,
    (r) => r.state,
    (r) => r.state,
    (r) => ({ state: r.state }),
    (r) => geoKey(r.state),
  );
}

/** One row per LGA within a state. */
export function lgaRows(data: ParticipationDataset, state: string): LevelSummary[] {
  return levelRows(
    data,
    data.rows.filter((r) => r.state === state),
    (r) => `${r.state}|${r.lga}`,
    (r) => r.lga,
    (r) => ({ state: r.state, lga: r.lga }),
    (r) => geoKey(r.state, r.lga),
  );
}

/** One row per ward within an LGA. */
export function wardRows(
  data: ParticipationDataset,
  state: string,
  lga: string,
): LevelSummary[] {
  return levelRows(
    data,
    data.rows.filter((r) => r.state === state && r.lga === lga),
    (r) => `${r.state}|${r.lga}|${r.ward}`,
    (r) => r.ward,
    (r) => ({ state: r.state, lga: r.lga, ward: r.ward }),
    (r) => geoKey(r.state, r.lga, r.ward),
  );
}

/** Raw polling units under a partial geography path. */
export function pollingUnitRows(
  data: ParticipationDataset,
  scope: { state?: string; lga?: string; ward?: string },
): PuRow[] {
  return data.rows.filter(
    (r) =>
      (!scope.state || r.state === scope.state) &&
      (!scope.lga || r.lga === scope.lga) &&
      (!scope.ward || r.ward === scope.ward),
  );
}

/**
 * How far apart a field figure and the baseline are. Anything past 2% is
 * material — big enough that one of the two is wrong rather than miscounted.
 */
export function reconciliationLabel(difference: number, baseline: number): string {
  if (baseline <= 0) return "requires_review";
  if (difference === 0) return "matched";
  return Math.abs(difference) / baseline > 0.02 ? "material_difference" : "minor_difference";
}

/* ------------------------------------------------------------------ */
/* Report validation                                                   */
/* ------------------------------------------------------------------ */

export interface ValidationIssue {
  code: AnomalyType | "negative_value" | "votes_above_registered";
  message: string;
  severity: AnomalySeverity;
  /** Blocking issues are refused outright; the rest submit but get flagged. */
  blocking: boolean;
}

export interface ReportDraft {
  registered: number | null;
  registeredDisplayed?: number | null;
  accredited?: number | null;
  participating?: number | null;
  valid?: number | null;
  invalid?: number | null;
  reportedAt?: string;
  agentId?: string | null;
  existingReports?: { reported_by: string; reported_at: string }[];
}

/**
 * Check a draft report before it is stored.
 *
 * This runs at capture time rather than during analysis so an agent sees the
 * problem while still standing at the polling unit. Figures that are merely
 * suspicious are allowed through and flagged; only the physically impossible
 * ones block.
 */
export function validateReport(draft: ReportDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const registered = draft.registered ?? null;

  const named = {
    accredited: draft.accredited,
    participating: draft.participating,
    valid: draft.valid,
    invalid: draft.invalid,
    displayed: draft.registeredDisplayed,
  };
  for (const [name, value] of Object.entries(named)) {
    if (typeof value === "number" && value < 0) {
      issues.push({
        code: "negative_value",
        message: `${name} cannot be negative`,
        severity: "high",
        blocking: true,
      });
    }
  }

  const votes = (draft.valid ?? 0) + (draft.invalid ?? 0);

  if (registered != null) {
    if (votes > registered) {
      issues.push({
        code: "votes_above_registered",
        message: "Total votes exceed registered voters",
        severity: "critical",
        blocking: true,
      });
    }
    if ((draft.accredited ?? 0) > registered) {
      issues.push({
        code: "accredited_above_registered",
        message: "Accredited voters exceed registered voters",
        severity: "critical",
        blocking: true,
      });
    }
    if ((draft.participating ?? 0) > registered) {
      issues.push({
        code: "participating_above_accredited",
        message: "Participating voters exceed registered voters",
        severity: "critical",
        blocking: true,
      });
    }
  }

  if (draft.participating != null && draft.accredited != null && draft.participating > draft.accredited) {
    issues.push({
      code: "participating_above_accredited",
      message: "Participating voters exceed accredited voters",
      severity: "high",
      blocking: false,
    });
  }

  if (
    draft.participating != null &&
    (draft.valid != null || draft.invalid != null) &&
    votes !== draft.participating
  ) {
    issues.push({
      code: "votes_inconsistent_with_participating",
      message: `Valid + invalid (${votes}) does not equal participating (${draft.participating})`,
      severity: "medium",
      blocking: false,
    });
  }

  if (draft.reportedAt && new Date(draft.reportedAt).getTime() > Date.now() + 60_000) {
    issues.push({
      code: "impossible_timestamp",
      message: "Report timestamp is in the future",
      severity: "high",
      blocking: true,
    });
  }

  if (draft.agentId && draft.existingReports?.some((r) => r.reported_by === draft.agentId)) {
    issues.push({
      code: "duplicate_agent_report",
      message: "This agent already submitted a report for this polling unit",
      severity: "high",
      blocking: true,
    });
  } else if (draft.existingReports && draft.existingReports.length > 0) {
    issues.push({
      code: "duplicate_pu_report",
      message: "Another agent already reported this polling unit — submission will be cross-checked",
      severity: "low",
      blocking: false,
    });
  }

  return issues;
}

/* ------------------------------------------------------------------ */
/* Seed dataset                                                        */
/* ------------------------------------------------------------------ */

/**
 * INEC 2023 register weight per state, in millions. Used only for relative
 * size — the generated footprint below is a phase-1 rollout slice, so national
 * totals are proportional to the real register rather than equal to it.
 */
const REGISTER_WEIGHT: Record<string, number> = {
  Lagos: 7.06,
  Kano: 5.92,
  Kaduna: 4.34,
  Rivers: 3.54,
  Katsina: 3.51,
  Oyo: 3.28,
  Delta: 3.22,
  Bauchi: 2.79,
  Niger: 2.69,
  Ogun: 2.69,
  Anambra: 2.68,
  Benue: 2.65,
  Plateau: 2.51,
  Borno: 2.51,
  Edo: 2.5,
  Imo: 2.42,
  "Akwa Ibom": 2.36,
  Jigawa: 2.35,
  Sokoto: 2.17,
  Abia: 2.1,
  Adamawa: 2.1,
  Zamfara: 2.0,
  Ondo: 1.99,
  Enugu: 1.98,
  Osun: 1.95,
  Kogi: 1.93,
  Kebbi: 1.8,
  Taraba: 1.78,
  "Cross River": 1.76,
  Kwara: 1.7,
  Nasarawa: 1.65,
  "FCT - Abuja": 1.57,
  Ebonyi: 1.5,
  Yobe: 1.49,
  Gombe: 1.48,
  Bayelsa: 1.06,
  Ekiti: 0.99,
};

/** Real national turnout, used as the historical benchmark spine. */
const NATIONAL_TURNOUT: Record<number, number> = { 2023: 26.72, 2019: 34.75, 2015: 43.65 };

/** Polling units generated per million registered voters in the weight table. */
const PUS_PER_MILLION = 70;

const WARDS_PER_LGA = 4;

const REGISTER_VERSIONS: (RegisterVersion & { growth: number })[] = [
  {
    id: "rv_2023_certified",
    code: "register_2023_certified",
    label: "2023 Certified Register",
    register_year: 2023,
    kind: "certified",
    source: "INEC certified register (post-2023 general)",
    verification_status: "verified",
    is_locked: true,
    growth: 1,
  },
  {
    id: "rv_2027_provisional",
    code: "register_2027_provisional",
    label: "2027 Provisional Register (CVR open)",
    register_year: 2027,
    kind: "cvr_update",
    source: "INEC continuous voter registration feed",
    verification_status: "pending_review",
    is_locked: false,
    growth: 1.14,
  },
  {
    id: "rv_2027_final",
    code: "register_2027_final",
    label: "2027 Final Register — Phase 1",
    register_year: 2027,
    kind: "final",
    source: "INEC",
    verification_status: "verified",
    is_locked: false,
    growth: 1.09,
  },
];

/** FNV-1a — stable across reloads so the same version renders the same seed. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** mulberry32, seeded by string. */
function rng(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: () => number, items: readonly T[]): T =>
  items[Math.floor(r() * items.length)];

const between = (r: () => number, lo: number, hi: number) => lo + r() * (hi - lo);

const PU_VENUES = [
  "Primary School",
  "Town Hall",
  "Community Centre",
  "Central Mosque",
  "Health Centre",
  "Open Space",
  "Model College",
  "Civic Centre",
];

const VERIFICATION_MIX: VerificationStatus[] = [
  "verified",
  "verified",
  "verified",
  "peer_reviewed",
  "peer_reviewed",
  "pending_review",
  "pending_review",
  "pending_review",
  "rejected",
];

const STATE_CODE = new Map(STATE_ACTIVITY.map((s) => [s.name, s.code]));

/**
 * Build the participation seed for a register version.
 *
 * Cheap enough to run inside a `useMemo` — roughly 6.5k polling units — and
 * fully deterministic, so switching versions and switching back is stable.
 */
export function loadParticipationDataset(versionId?: string | null): ParticipationDataset {
  const version =
    REGISTER_VERSIONS.find((v) => v.id === versionId) ??
    REGISTER_VERSIONS.find((v) => v.code === "register_2027_final") ??
    REGISTER_VERSIONS[REGISTER_VERSIONS.length - 1];

  const rows: PuRow[] = [];
  const anomalies: TurnoutAnomaly[] = [];
  const discrepancies: RegisterDiscrepancy[] = [];
  const now = Date.now();
  let reportCount = 0;

  for (const state of STATE_ACTIVITY) {
    const weight = REGISTER_WEIGHT[state.name] ?? 1.5;
    const r = rng(`${version.id}:${state.name}`);

    // How much of this state has reported at all. Field activity is the best
    // proxy we have for how far the agent network has actually got.
    const coverage = Math.min(0.94, Math.max(0.34, state.activity / 100 + between(r, -0.16, 0.08)));
    // Accreditation as a share of the register, inside reporting units only.
    const accreditationShare = between(r, 0.34, 0.47);

    const puTarget = Math.max(24, Math.round(weight * PUS_PER_MILLION));
    const perWard = Math.max(2, Math.round(puTarget / (state.lgas.length * WARDS_PER_LGA)));
    const code = STATE_CODE.get(state.name) ?? state.name.slice(0, 2).toUpperCase();

    state.lgas.forEach((lga, lgaIndex) => {
      for (let w = 1; w <= WARDS_PER_LGA; w++) {
        for (let p = 1; p <= perWard; p++) {
          const seq = rows.length;
          const puId = `pu_${code}_${lgaIndex + 1}_${w}_${p}`;
          const inecPuId = `${code}/${String(lgaIndex + 1).padStart(2, "0")}/${String(w).padStart(2, "0")}/${String(p).padStart(3, "0")}`;
          const registered = Math.round(between(r, 300, 1180) * version.growth);
          // An unverified baseline is itself a data-quality signal, so the
          // share tracks the version's own verification state.
          const registerVerified = r() < (version.verification_status === "verified" ? 0.86 : 0.52);

          const reports: TurnoutReport[] = [];
          const covered = r() < coverage;

          if (covered) {
            const count = r() < 0.06 ? 2 : 1;
            for (let i = 0; i < count; i++) {
              let accredited = Math.round(registered * (accreditationShare + between(r, -0.05, 0.05)));
              let participating = Math.round(accredited * between(r, 0.93, 1.0));
              let invalid = Math.round(participating * between(r, 0.014, 0.048));
              let valid = participating - invalid;

              // Deliberate bad data. Roughly one unit in eighty reports figures
              // that are internally impossible — that is what the anomaly feed
              // and the analyst queue exist to catch.
              const defect = r();
              if (defect < 0.006) {
                accredited = Math.round(registered * between(r, 1.03, 1.22));
                participating = Math.round(accredited * 0.97);
                invalid = Math.round(participating * 0.03);
                valid = participating - invalid;
              } else if (defect < 0.011) {
                participating = Math.round(accredited * between(r, 1.04, 1.15));
                invalid = Math.round(participating * 0.03);
                valid = participating - invalid;
              } else if (defect < 0.016) {
                valid = Math.round(valid * between(r, 1.06, 1.18));
              }

              reports.push({
                id: `rpt_${seq}_${i}`,
                polling_unit_id: puId,
                register_version_id: version.id,
                baseline_registered_voters: registered,
                // Most agents confirm the displayed figure matches; a few find
                // the board at the unit saying something else.
                // Most confirmations match. Of the rest, a small miscount is
                // ordinary and a large gap is the rare case worth escalating.
                registered_voters_displayed:
                  r() < 0.07
                    ? registered +
                      Math.round(r() < 0.18 ? between(r, -140, 140) : between(r, -9, 9))
                    : registered,
                accredited_voters: accredited,
                participating_voters: participating,
                valid_votes: valid,
                invalid_votes: r() < 0.015 ? null : invalid,
                result_observations: null,
                incident_note: null,
                verification_status: pick(r, VERIFICATION_MIX),
                is_duplicate: i > 0,
                validation_flags: [],
                // A second report from the *same* agent is a different problem
                // from two agents disagreeing, so let both cases occur.
                reported_by:
                  i > 0 && r() < 0.3
                    ? reports[0].reported_by
                    : `agt_${code}_${1000 + Math.floor(r() * 8000)}`,
                // A handful of devices have their clock wrong, which is itself
                // a flag rather than something to silently correct.
                reported_at: new Date(
                  now +
                    (r() < 0.004
                      ? Math.round(between(r, 90, 400))
                      : -Math.round(between(r, 2, 560))) *
                      60_000,
                ).toISOString(),
              });
            }
            reportCount += reports.length;
          }

          const row: PuRow = {
            id: puId,
            inec_pu_id: inecPuId,
            name: `${lga} ${pick(r, PU_VENUES)} ${p.toString().padStart(3, "0")}`,
            state: state.name,
            lga,
            ward: `Ward ${w}`,
            registered,
            registerVerified,
            registerVersionId: version.id,
            reports,
            report: pickReport(reports),
            anomalies: 0,
          };

          // Raise the flags the reports above earned.
          const flag = (type: AnomalyType, severity: AnomalySeverity, detail: string) => {
            row.anomalies += 1;
            anomalies.push({
              id: `anm_${anomalies.length}`,
              polling_unit_id: puId,
              anomaly_type: type,
              severity,
              status: r() < 0.12 ? "dismissed" : r() < 0.2 ? "confirmed" : r() < 0.34 ? "reviewing" : "open",
              detail: `${inecPuId} · ${detail}`,
              detected_at: new Date(now - Math.round(between(r, 1, 620)) * 60_000).toISOString(),
            });
          };

          const best = row.report;
          if (best) {
            const acc = best.accredited_voters ?? 0;
            const part = best.participating_voters ?? 0;
            const votes = (best.valid_votes ?? 0) + (best.invalid_votes ?? 0);

            if (votes > registered) {
              flag(
                "turnout_above_registered",
                "critical",
                `${formatCount(votes)} votes cast against ${formatCount(registered)} registered`,
              );
            }
            if (acc > registered) {
              flag(
                "accredited_above_registered",
                "critical",
                `${formatCount(acc)} accredited against ${formatCount(registered)} registered`,
              );
            }
            if (part > acc) {
              flag(
                "participating_above_accredited",
                "high",
                `${formatCount(part)} participating against ${formatCount(acc)} accredited`,
              );
            }
            if (best.invalid_votes != null && votes !== part) {
              flag(
                "votes_inconsistent_with_participating",
                "medium",
                `Valid + invalid (${formatCount(votes)}) does not equal participating (${formatCount(part)})`,
              );
            }
            if (reports.length > 1) {
              const sameAgent = reports[0].reported_by === reports[1].reported_by;
              if (sameAgent) {
                flag(
                  "duplicate_agent_report",
                  "high",
                  `Agent ${reports[0].reported_by} submitted this unit twice`,
                );
              } else {
                flag(
                  "duplicate_pu_report",
                  "low",
                  "Two agents reported this unit — figures are being cross-checked",
                );
              }
            }
            if (new Date(best.reported_at).getTime() > now + 60_000) {
              flag("impossible_timestamp", "high", "Report timestamp is in the future");
            }
          } else if (r() < 0.012) {
            flag("missing_polling_unit", "medium", "No report received since polls opened");
          }

          if (r() < 0.004) {
            flag("unexpected_register_change", "high", "Baseline changed after version lock");
          }

          // A field figure disagreeing with the baseline raises a record; it
          // never edits the register. Only a new version import does that.
          const displayed = best?.registered_voters_displayed ?? null;
          if (best && displayed != null && displayed !== registered) {
            const difference = displayed - registered;
            const material = Math.abs(difference) / Math.max(1, registered) > 0.02;

            discrepancies.push({
              id: `dsc_${discrepancies.length}`,
              polling_unit_id: puId,
              register_version_id: version.id,
              turnout_report_id: best.id,
              inec_registered_voters: registered,
              reported_registered_voters: displayed,
              difference,
              severity: material ? "material" : "minor",
              note: "Raised automatically from a field turnout report.",
              status: pick(r, [
                "open",
                "open",
                "reviewing",
                "resolved_inec_correct",
                "resolved_register_updated",
                "dismissed",
              ] as const),
              created_at: best.reported_at,
            });

            // A material gap is not just something to reconcile later — it
            // means one of the two figures is wrong, so an analyst is paged.
            if (material) {
              flag(
                "material_reconciliation_difference",
                "high",
                `Field count ${formatCount(displayed)} against baseline ${formatCount(registered)}`,
              );
            }
          }

          rows.push(row);
        }
      }
    });
  }

  // Historical benchmarks: the real national figure, with each state offset by
  // a stable amount so the state table has something to compare against.
  const historical: HistoricalTurnout[] = [];
  for (const year of HISTORICAL_YEARS) {
    historical.push({ level: "national", election_year: year, turnout_percentage: NATIONAL_TURNOUT[year] });
    for (const state of STATE_ACTIVITY) {
      const r = rng(`hist:${state.name}:${year}`);
      historical.push({
        level: "state",
        state: state.name,
        election_year: year,
        turnout_percentage: +Math.max(
          9,
          Math.min(72, NATIONAL_TURNOUT[year] + between(r, -11, 13)),
        ).toFixed(2),
      });
    }
  }

  anomalies.sort((a, b) => +new Date(b.detected_at) - +new Date(a.detected_at));
  discrepancies.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  return {
    versions: REGISTER_VERSIONS.map((v) => ({
      id: v.id,
      code: v.code,
      label: v.label,
      register_year: v.register_year,
      kind: v.kind,
      source: v.source,
      verification_status: v.verification_status,
      is_locked: v.is_locked,
    })),
    activeVersionId: version.id,
    rows,
    historical,
    discrepancies,
    anomalies,
    reportCount,
  };
}
