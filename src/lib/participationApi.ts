/**
 * Adapts the participation API onto the `LevelSummary` shape the existing
 * tables, KPIs and map render.
 *
 * Counts, rates and coverage come from the server's aggregates, which apply
 * the selected mode and exclude conflicting or quality-flagged reports — the
 * same figures the Dashboard shows, including each unit's full register
 * total. What the aggregates don't carry (verification mix, anomalies) is
 * rolled up locally from register entries, reports and quality cases.
 */
import { scoreConfidence, type LevelSummary } from "./participation";
import type {
  ParticipationMetric,
  ParticipationReport,
  QualityCase,
  RegisterEntry,
} from "../services/participation";
import type { UnitLineage } from "../hooks/useUnitNames";

export const NATIONAL = "national";

/** Per-unit figures the server aggregates don't provide. */
export interface UnitStats {
  /** INEC registered voters under the unit; NaN when the register can't be fully placed. */
  registered: number;
  /** Register entries placed under the unit. */
  entries: number;
  verified: number;
  unverified: number;
  anomalies: number;
  lastReportAt: string | null;
  completeFields: number;
  expectedFields: number;
}

const emptyStats = (): UnitStats => ({
  registered: 0,
  entries: 0,
  verified: 0,
  unverified: 0,
  anomalies: 0,
  lastReportAt: null,
  completeFields: 0,
  expectedFields: 0,
});

/** The national bucket plus every ancestor unit of a polling unit. */
function bucketsFor(lineage: (id: string) => UnitLineage | undefined, puId: string | null) {
  const out = [NATIONAL];
  const l = puId ? lineage(puId) : undefined;
  if (l) {
    out.push(l.unit.id);
    for (const u of [l.state, l.lga, l.ward]) if (u) out.push(u.id);
  }
  return out;
}

/**
 * Rolls register entries, reports and quality cases up to every geographic
 * unit they sit under. A register total is only trusted for a unit when all
 * the register could be fetched and placed; otherwise it becomes NaN, which
 * the formatters render as "—".
 */
export function rollUpStats(input: {
  entries: RegisterEntry[];
  entriesComplete: boolean;
  reports: ParticipationReport[];
  qualityCases: QualityCase[];
  lineage: (id: string) => UnitLineage | undefined;
}): Map<string, UnitStats> {
  const stats = new Map<string, UnitStats>();
  const at = (key: string) => {
    let s = stats.get(key);
    if (!s) stats.set(key, (s = emptyStats()));
    return s;
  };
  at(NATIONAL);

  let unplaced = 0;
  for (const e of input.entries) {
    const buckets = bucketsFor(input.lineage, e.polling_unit_id);
    if (buckets.length === 1) unplaced += 1;
    for (const key of buckets) {
      const s = at(key);
      s.registered += e.registered_count;
      s.entries += 1;
    }
  }
  if (!input.entriesComplete) at(NATIONAL).registered = NaN;
  // A unit total is partial while any entry is still unplaced.
  if (unplaced > 0 || !input.entriesComplete) {
    for (const [key, s] of stats) if (key !== NATIONAL) s.registered = NaN;
  }

  const unitByReport = new Map<string, string | null>();
  for (const r of input.reports) {
    unitByReport.set(r.id, r.polling_unit_id);
    const verified = r.review_state === "verified";
    const rejected = r.review_state === "rejected";
    const fields = [r.participation?.accredited_persons, r.participation?.participating_persons];
    for (const key of bucketsFor(input.lineage, r.polling_unit_id)) {
      const s = at(key);
      if (verified) s.verified += 1;
      else if (!rejected) s.unverified += 1;
      if (!s.lastReportAt || r.received_at > s.lastReportAt) s.lastReportAt = r.received_at;
      s.expectedFields += fields.length;
      s.completeFields += fields.filter((f) => typeof f === "number").length;
    }
  }

  for (const q of input.qualityCases) {
    if (q.status === "dismissed" || q.status === "resolved") continue;
    for (const key of bucketsFor(input.lineage, unitByReport.get(q.report_id) ?? null)) {
      at(key).anomalies += 1;
    }
  }

  return stats;
}

/** Builds one table/map row from a server aggregate and the local roll-up. */
export function toLevelSummary(input: {
  key: string;
  label: string;
  state?: string;
  lga?: string;
  ward?: string;
  eligiblePlaces: number;
  /** The server's register total for the unit; the local roll-up stands in when absent. */
  registeredTotal: number | null | undefined;
  accredited: ParticipationMetric;
  participating: ParticipationMetric;
  stats: UnitStats | undefined;
  registerPublished: boolean;
  valid?: number;
  invalid?: number;
  historicalTurnout?: number | null;
}): LevelSummary {
  const s = input.stats ?? { ...emptyStats(), registered: NaN };
  const registered = input.registeredTotal ?? s.registered;
  const coveredRegistered = input.participating.registered_denominator;
  const voterCoverage =
    Number.isFinite(registered) && registered > 0
      ? (coveredRegistered / registered) * 100
      : input.participating.coverage_percent;
  const totalReports = s.verified + s.unverified;
  const valid = input.valid ?? NaN;
  const invalid = input.invalid ?? NaN;
  const participatingCount = input.participating.count;
  const observed = input.participating.rate_percent;
  const historicalTurnout = input.historicalTurnout ?? null;

  return {
    key: input.key,
    label: input.label,
    state: input.state,
    lga: input.lga,
    ward: input.ward,
    totalPus: input.eligiblePlaces,
    coveredPus: input.participating.reporting_places,
    registered,
    coveredRegistered,
    accredited: input.accredited.count,
    participating: participatingCount,
    valid,
    invalid,
    verifiedReports: s.verified,
    unverifiedReports: s.unverified,
    anomalies: s.anomalies,
    lastReportAt: s.lastReportAt,
    metrics: {
      // The server rates are against the register of reporting places, which
      // is what the Dashboard shows; coverage says how much of the register
      // that is.
      accreditationRate: input.accredited.rate_percent,
      participationRate: observed,
      validVoteRate:
        Number.isFinite(valid) && coveredRegistered > 0 ? (valid / coveredRegistered) * 100 : null,
      invalidVoteRate:
        Number.isFinite(invalid) && participatingCount > 0
          ? (invalid / participatingCount) * 100
          : null,
      puCoverage: input.participating.coverage_percent,
      voterCoverage,
    },
    historicalTurnout,
    historicalDelta:
      historicalTurnout != null && observed != null ? +(observed - historicalTurnout).toFixed(2) : null,
    confidence: scoreConfidence({
      voterCoverage,
      verifiedReports: s.verified,
      totalReports,
      completeFields: s.completeFields,
      expectedFields: s.expectedFields,
      registerVerifiedShare: input.registerPublished ? 1 : 0,
      anomalies: s.anomalies,
    }),
  };
}

/** Turnout from a sourced historical benchmark, if it has the figures. */
export function benchmarkTurnout(
  b: { registered_count: number | null; ballots_cast: number | null } | null | undefined,
): number | null {
  if (!b?.registered_count || b.ballots_cast == null) return null;
  return +((b.ballots_cast / b.registered_count) * 100).toFixed(2);
}
