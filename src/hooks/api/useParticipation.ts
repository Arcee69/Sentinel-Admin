import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { participationApi, type ParticipationMode } from "../../services/participation";
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
