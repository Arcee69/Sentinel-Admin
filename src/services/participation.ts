import { API } from "./api";
import { getAllPages, getList, getMethod } from "./requests";
import type { ParticipationMetric, ParticipationMode, ParticipationSummary } from "./dashboard";

export type { ParticipationMetric, ParticipationMode, ParticipationSummary };

/** One child unit of `parent_unit_id`, with the same metrics as the summary. */
export interface ParticipationUnit {
  geographic_unit_id: string;
  parent_id: string | null;
  kind: string;
  official_code: string;
  name: string;
  eligible_polling_places: number;
  accredited_persons: ParticipationMetric;
  participating_persons: ParticipationMetric;
}

export interface ParticipationGeography {
  polling_occasion_id: string;
  mode: ParticipationMode;
  parent_unit_id: string | null;
  as_of: string;
  units: ParticipationUnit[];
}

export interface BallotMetric {
  count: number;
  reporting_places: number;
  excluded_conflicts: number;
  coverage_percent: number | null;
}

export interface BallotsSummary {
  contest_round_id: string;
  mode: ParticipationMode;
  eligible_polling_places: number;
  cast_ballots: BallotMetric;
  valid_ballots: BallotMetric;
  invalid_ballots: BallotMetric;
}

export interface ContestRound {
  id: string;
  contest_id: string;
  polling_occasion_id: string;
  round_kind: string;
  sequence: number;
  status: string;
}

export interface HistoricalBenchmark {
  registered_count: number | null;
  ballots_cast: number | null;
  valid_votes: number | null;
  rejected_votes: number | null;
}

export interface RegisterVersion {
  id: string;
  geography_version_id: string;
  reference_source_id: string;
  name: string;
  year: number;
  status: string;
  published_at: string | null;
  import: { status: string; row_count: number; error_count: number; errors: unknown[] } | null;
}

export interface RegisterEntry {
  id: string;
  register_version_id: string;
  polling_unit_id: string;
  registered_count: number;
  source_row_ref: string | null;
}

/** The fields participation needs from a polling report. */
export interface ParticipationReport {
  id: string;
  polling_place_id: string;
  polling_unit_id: string | null;
  polling_occasion_id: string;
  review_state: string;
  revision: number;
  observed_at: string;
  received_at: string;
  reported_registered_count: number | null;
  participation: {
    accredited_persons: number | null;
    participating_persons: number | null;
    collection_method: string | null;
    quality_eligible: boolean;
  } | null;
}

export interface QualityCase {
  id: string;
  organization_id: string;
  report_id: string;
  polling_place_id: string;
  rule_code: string;
  rule_version: number;
  severity: string;
  status: string;
  revision: number;
  detected_at: string;
}

export interface RegisterDiscrepancyRecord {
  id: string;
  organization_id: string;
  report_id: string;
  baseline_entry_id: string;
  reported_count: number;
  status: string;
  revision: number;
}

/** Register entries come in pages of 100; a national register is far larger. */
const ENTRY_PAGE_CAP = 20;

export const participationApi = {
  summary: (
    campaignId: string,
    query: { polling_occasion_id: string; mode: ParticipationMode; geographic_unit_id?: string },
  ) => getMethod<ParticipationSummary>(API.campaign.participationSummary(campaignId), query),
  geography: (
    campaignId: string,
    query: { polling_occasion_id: string; mode: ParticipationMode; parent_unit_id?: string },
  ) => getMethod<ParticipationGeography>(API.campaign.participationGeography(campaignId), query),
  ballots: (campaignId: string, query: { contest_round_id: string; mode: ParticipationMode }) =>
    getMethod<BallotsSummary>(API.campaign.ballotsSummary(campaignId), query),
  rounds: (pollingOccasionId: string) =>
    getAllPages<ContestRound>(API.catalog.contestRounds, { polling_occasion_id: pollingOccasionId }),
  benchmark: (contestId: string) => getMethod<HistoricalBenchmark>(API.catalog.historicalBenchmark(contestId)),
  registerVersions: () => getAllPages<RegisterVersion>(API.catalog.registerVersions),
  /**
   * The register baseline. `complete` is false when the register is larger
   * than the page cap, so totals built from it must not be shown as whole.
   */
  registerEntries: async (versionId: string) => {
    const first = await getList<RegisterEntry>(API.catalog.registerEntries(versionId));
    const entries = [...first.data];
    const lastPage = Number(first.meta?.last_page ?? 1);
    const last = Math.min(lastPage, ENTRY_PAGE_CAP);
    for (let page = 2; page <= last; page++) {
      entries.push(...(await getList<RegisterEntry>(API.catalog.registerEntries(versionId), { page })).data);
    }
    return { entries, complete: lastPage <= ENTRY_PAGE_CAP };
  },
  reports: (campaignId: string) =>
    getAllPages<ParticipationReport>(API.campaign.pollingReports(campaignId)),
  qualityCases: (campaignId: string) => getAllPages<QualityCase>(API.campaign.qualityCases(campaignId)),
  discrepancies: (campaignId: string) =>
    getAllPages<RegisterDiscrepancyRecord>(API.campaign.registerDiscrepancies(campaignId)),
};
