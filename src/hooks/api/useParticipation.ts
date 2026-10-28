import { useMemo } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  participationApi,
  type ParticipationMode,
  type ParticipationReport,
} from "../../services/participation";
import { toApiError } from "../../services/errors";
import { useParticipation } from "../../context/ParticipationContext";
import { useFilters } from "../../context/FilterContext";
import { usePollingOccasions } from "./useDashboard";
import { useContests } from "./useElections";
import { useUnitLineage } from "../useUnitNames";
import {
  NATIONAL,
  benchmarkTurnout,
  rollUpStats,
  toLevelSummary,
} from "../../lib/participationApi";
import type { LevelSummary } from "../../lib/participation";

/** Participation figures move on polling day; the summaries refresh this often. */
const LIVE_REFRESH = 60_000;

/** Provisional counts every non-rejected report, matching the Dashboard. */
export const PARTICIPATION_MODE: ParticipationMode = "provisional";

export function useRegisterVersions() {
  return useQuery({
    queryKey: ["catalog", "register-versions"],
    queryFn: participationApi.registerVersions,
    staleTime: 10 * 60_000,
  });
}

export function useRegisterEntries(versionId: string | undefined) {
  return useQuery({
    queryKey: ["catalog", "register-entries", versionId],
    queryFn: () => participationApi.registerEntries(versionId!),
    enabled: !!versionId,
    staleTime: 10 * 60_000,
  });
}

export function useParticipationReports(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign", campaignId, "polling-reports", "full"],
    queryFn: () => participationApi.reports(campaignId!),
    enabled: !!campaignId,
    refetchInterval: 60_000,
  });
}

export function useQualityCases(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign", campaignId, "quality-cases"],
    queryFn: () => participationApi.qualityCases(campaignId!),
    enabled: !!campaignId,
  });
}

export function useRegisterDiscrepancies(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign", campaignId, "register-discrepancies"],
    queryFn: () => participationApi.discrepancies(campaignId!),
    enabled: !!campaignId,
  });
}

/**
 * The register version chosen on the National page and the published polling
 * occasion built on it — every participation figure is for that occasion.
 */
export function useParticipationSetup() {
  const { versionId } = useParticipation();
  const versions = useRegisterVersions();
  const occasions = usePollingOccasions();

  const published = (versions.data ?? []).filter((v) => v.status === "published");
  const version =
    (versions.data ?? []).find((v) => v.id === versionId) ?? published[0] ?? versions.data?.[0];
  const occasion =
    (occasions.data ?? []).find((o) => o.register_version_id === version?.id) ??
    occasions.data?.[0];

  return {
    versions: versions.data ?? [],
    version,
    occasion,
    mode: PARTICIPATION_MODE,
    isLoading: versions.isLoading || occasions.isLoading,
    error: versions.error ?? occasions.error,
  };
}

/** Local roll-up of register, verification and anomaly figures per unit. */
export function useParticipationStats() {
  const { apiCampaign } = useFilters();
  const { version } = useParticipationSetup();
  const entries = useRegisterEntries(version?.id);
  const reports = useParticipationReports(apiCampaign?.id);
  const cases = useQualityCases(apiCampaign?.id);

  const unitIds = useMemo(
    () => [
      ...(entries.data?.entries ?? []).map((e) => e.polling_unit_id),
      ...(reports.data ?? []).map((r) => r.polling_unit_id),
    ],
    [entries.data, reports.data],
  );
  const lineage = useUnitLineage(unitIds);

  const stats = useMemo(
    () =>
      rollUpStats({
        entries: entries.data?.entries ?? [],
        entriesComplete: entries.data?.complete ?? false,
        reports: reports.data ?? [],
        qualityCases: cases.data ?? [],
        lineage,
      }),
    [entries.data, reports.data, cases.data, lineage],
  );

  return {
    stats,
    entries: entries.data?.entries ?? [],
    reports: reports.data ?? [],
    qualityCases: cases.data ?? [],
    lineage,
    isLoading: entries.isLoading || reports.isLoading || cases.isLoading,
  };
}

/**
 * The national headline. Valid/invalid ballots and the historical benchmark
 * come from the occasion's presidential round, the one race decided nationally.
 */
export function useNationalSummary() {
  const { apiCampaign } = useFilters();
  const { occasion, version, mode, isLoading: setupLoading, error: setupError } =
    useParticipationSetup();
  const { stats } = useParticipationStats();
  const campaignId = apiCampaign?.id;

  const summary = useQuery({
    queryKey: ["campaign", campaignId, "participation-summary", occasion?.id, mode],
    queryFn: async () =>
      (await participationApi.summary(campaignId!, { polling_occasion_id: occasion!.id, mode })).data,
    enabled: !!campaignId && !!occasion,
    refetchInterval: LIVE_REFRESH,
  });

  const rounds = useQuery({
    queryKey: ["catalog", "contest-rounds", occasion?.id],
    queryFn: () => participationApi.rounds(occasion!.id),
    enabled: !!occasion,
    staleTime: 10 * 60_000,
  });
  const contests = useContests(occasion ? [occasion.election_cycle_id] : []);
  const presidential = (contests.data ?? []).find((c) => c.office_type === "presidential");
  const round = (rounds.data ?? []).find((r) => r.contest_id === presidential?.id);

  const ballots = useQuery({
    queryKey: ["campaign", campaignId, "ballots-summary", round?.id, mode],
    queryFn: async () =>
      (await participationApi.ballots(campaignId!, { contest_round_id: round!.id, mode })).data,
    enabled: !!campaignId && !!round,
  });

  const benchmark = useQuery({
    queryKey: ["catalog", "historical-benchmark", presidential?.id],
    queryFn: async () => {
      try {
        return (await participationApi.benchmark(presidential!.id)).data;
      } catch (err) {
        // No sourced benchmark yet is a normal state, not an error.
        if (toApiError(err).status === 404) return null;
        throw err;
      }
    },
    enabled: !!presidential,
    staleTime: 10 * 60_000,
  });

  const level = useMemo<LevelSummary | null>(() => {
    const s = summary.data;
    if (!s) return null;
    return toLevelSummary({
      key: NATIONAL,
      label: "Nigeria",
      eligiblePlaces: s.eligible_polling_places,
      registeredTotal: s.registered_total,
      accredited: s.accredited_persons,
      participating: s.participating_persons,
      stats: stats.get(NATIONAL),
      registerPublished: version?.status === "published",
      valid: ballots.data?.valid_ballots.count,
      invalid: ballots.data?.invalid_ballots.count,
      historicalTurnout: benchmarkTurnout(benchmark.data),
    });
  }, [summary.data, stats, version, ballots.data, benchmark.data]);

  return {
    summary: level,
    isLoading: setupLoading || summary.isLoading,
    error: setupError ?? summary.error,
    refetch: summary.refetch,
  };
}

/**
 * One row per child of `parentUnitId` (the country for states, a state for
 * LGAs, an LGA for wards), from the server's per-unit aggregates.
 */
export function useLevelRows(
  parentUnitId: string | null | undefined,
  context: { state?: string; lga?: string } = {},
) {
  const { apiCampaign } = useFilters();
  const { occasion, version, mode } = useParticipationSetup();
  const { stats } = useParticipationStats();
  const campaignId = apiCampaign?.id;

  const query = useQuery({
    queryKey: ["campaign", campaignId, "participation-geography", occasion?.id, mode, parentUnitId],
    queryFn: async () =>
      (
        await participationApi.geography(campaignId!, {
          polling_occasion_id: occasion!.id,
          mode,
          parent_unit_id: parentUnitId!,
        })
      ).data,
    enabled: !!campaignId && !!occasion && !!parentUnitId,
    refetchInterval: LIVE_REFRESH,
  });

  const rows = useMemo<LevelSummary[]>(
    () =>
      (query.data?.units ?? [])
        .map((u) =>
          toLevelSummary({
            key: u.geographic_unit_id,
            label: u.name,
            state: context.state ?? (u.kind === "state" ? u.name : undefined),
            lga: context.lga ?? (u.kind === "lga" ? u.name : undefined),
            ward: u.kind === "ward" ? u.name : undefined,
            eligiblePlaces: u.eligible_polling_places,
            registeredTotal: u.registered_total,
            accredited: u.accredited_persons,
            participating: u.participating_persons,
            stats: stats.get(u.geographic_unit_id),
            registerPublished: version?.status === "published",
          }),
        )
        .sort(
          (a, b) =>
            (Number.isFinite(b.registered) ? b.registered : b.coveredRegistered) -
            (Number.isFinite(a.registered) ? a.registered : a.coveredRegistered),
        ),
    [query.data, stats, version, context.state, context.lga],
  );

  return { rows, isLoading: query.isLoading, error: query.error, refetch: query.refetch };
}

/** One polling unit: its register baseline, place in the hierarchy and reports. */
export interface PollingUnitRow {
  id: string;
  entryId: string;
  code: string;
  name: string;
  state: string;
  lga: string;
  ward: string;
  /** INEC baseline from the register entry. */
  registered: number;
  reports: ParticipationReport[];
  /** The report the row shows: verified first, then the newest. */
  report: ParticipationReport | null;
  anomalies: number;
}

const REVIEW_RANK: Record<string, number> = {
  verified: 0,
  pending_review: 1,
  revoked: 2,
  rejected: 3,
};

function bestReport(reports: ParticipationReport[]): ParticipationReport | null {
  if (!reports.length) return null;
  return [...reports].sort(
    (a, b) =>
      (REVIEW_RANK[a.review_state] ?? 3) - (REVIEW_RANK[b.review_state] ?? 3) ||
      b.received_at.localeCompare(a.received_at),
  )[0];
}

/** Every polling unit on the active register, joined to its reports and anomalies. */
export function usePollingUnitRows() {
  const { entries, reports, qualityCases, lineage, isLoading } = useParticipationStats();

  const rows = useMemo<PollingUnitRow[]>(() => {
    const byUnit = new Map<string, ParticipationReport[]>();
    for (const r of reports) {
      if (!r.polling_unit_id) continue;
      const list = byUnit.get(r.polling_unit_id) ?? [];
      list.push(r);
      byUnit.set(r.polling_unit_id, list);
    }
    const unitByReport = new Map(reports.map((r) => [r.id, r.polling_unit_id]));
    const anomalies = new Map<string, number>();
    for (const q of qualityCases) {
      if (q.status === "dismissed" || q.status === "resolved") continue;
      const unit = unitByReport.get(q.report_id);
      if (unit) anomalies.set(unit, (anomalies.get(unit) ?? 0) + 1);
    }

    return entries
      .map((e) => {
        const place = lineage(e.polling_unit_id);
        const unitReports = byUnit.get(e.polling_unit_id) ?? [];
        return {
          id: e.polling_unit_id,
          entryId: e.id,
          code: place?.unit.official_code ?? "—",
          name: place?.unit.name ?? "Unplaced polling unit",
          state: place?.state?.name ?? "",
          lga: place?.lga?.name ?? "",
          ward: place?.ward?.name ?? "",
          registered: e.registered_count,
          reports: unitReports,
          report: bestReport(unitReports),
          anomalies: anomalies.get(e.polling_unit_id) ?? 0,
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [entries, reports, qualityCases, lineage]);

  return { rows, isLoading };
}

/** Reviews and transitions move every participation figure, so refresh them all. */
function useInvalidateParticipation() {
  const queryClient = useQueryClient();
  const { apiCampaign } = useFilters();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["campaign", apiCampaign?.id] });
    void queryClient.invalidateQueries({ queryKey: ["catalog", "register-versions"] });
  };
}

export function useReviewReport() {
  const invalidate = useInvalidateParticipation();
  return useMutation({
    mutationFn: ({ reportId, ...payload }: { reportId: string } & Parameters<typeof participationApi.reviewReport>[1]) =>
      participationApi.reviewReport(reportId, payload),
    onSettled: invalidate,
  });
}

export function useTransitionDiscrepancy() {
  const invalidate = useInvalidateParticipation();
  return useMutation({
    mutationFn: ({
      discrepancyId,
      ...payload
    }: { discrepancyId: string } & Parameters<typeof participationApi.transitionDiscrepancy>[1]) =>
      participationApi.transitionDiscrepancy(discrepancyId, payload),
    onSettled: invalidate,
  });
}

export function useTransitionQualityCase() {
  const invalidate = useInvalidateParticipation();
  return useMutation({
    mutationFn: ({
      caseId,
      ...payload
    }: { caseId: string } & Parameters<typeof participationApi.transitionQualityCase>[1]) =>
      participationApi.transitionQualityCase(caseId, payload),
    onSettled: invalidate,
  });
}

export function usePublishRegister() {
  const invalidate = useInvalidateParticipation();
  return useMutation({
    mutationFn: (versionId: string) => participationApi.publishRegister(versionId),
    onSettled: invalidate,
  });
}

/**
 * Historical benchmarks for the occasion's contests, each placed at the
 * geography it covers: the presidential contest nationally, and every other
 * contest at the state its electoral district sits in.
 */
/** Stable `combine`s so the combined results only change when the data does. */
const firstUnitIds = (results: { data?: { id: string }[] }[]) =>
  results.map((r) => r.data?.[0]?.id ?? null);
const benchmarkResults = (
  results: { data?: Parameters<typeof benchmarkTurnout>[0]; isLoading: boolean }[],
) => ({
  turnouts: results.map((r) => benchmarkTurnout(r.data)),
  isLoading: results.some((r) => r.isLoading),
});

export function useContestBenchmarks() {
  const { occasion } = useParticipationSetup();
  const contests = useContests(occasion ? [occasion.election_cycle_id] : []);
  const list = useMemo(() => contests.data ?? [], [contests.data]);

  const sampleUnits = useQueries({
    queries: list.map((c) => ({
      queryKey: ["catalog", "district-units", c.electoral_district_id],
      queryFn: async () => (await participationApi.districtPollingUnits(c.electoral_district_id)).data,
      enabled: c.office_type !== "presidential",
      staleTime: 10 * 60_000,
    })),
    combine: firstUnitIds,
  });
  const benchmarks = useQueries({
    queries: list.map((c) => ({
      queryKey: ["catalog", "historical-benchmark", c.id],
      queryFn: async () => {
        try {
          return (await participationApi.benchmark(c.id)).data;
        } catch (err) {
          // No sourced benchmark yet is a normal state, not an error.
          if (toApiError(err).status === 404) return null;
          throw err;
        }
      },
      staleTime: 10 * 60_000,
    })),
    combine: benchmarkResults,
  });

  // One polling unit per district is enough to find its state.
  const lineage = useUnitLineage(sampleUnits);

  return useMemo(() => {
    let national: number | null = null;
    const byState = new Map<string, number>();
    list.forEach((c, i) => {
      const turnout = benchmarks.turnouts[i];
      if (turnout == null) return;
      if (c.office_type === "presidential") national = turnout;
      else {
        const state = lineage(sampleUnits[i])?.state;
        if (state) byState.set(state.id, turnout);
      }
    });
    return { national, byState, isLoading: contests.isLoading || benchmarks.isLoading };
  }, [list, benchmarks, lineage, sampleUnits, contests.isLoading]);
}
