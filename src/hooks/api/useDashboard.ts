import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { dashboardApi, type ParticipationMode } from "../../services/dashboard";

const ACTIVITY_PAGE = 15;

export function useDashboardOverview(
  campaignId: string | undefined,
  params: { pollingOccasionId?: string | null; mode?: ParticipationMode } = {},
) {
  const { pollingOccasionId, mode } = params;
  return useQuery({
    queryKey: ["campaign", campaignId, "overview", pollingOccasionId ?? null, mode ?? null],
    queryFn: async () =>
      (
        await dashboardApi.overview(campaignId!, {
          polling_occasion_id: pollingOccasionId ?? undefined,
          mode: pollingOccasionId ? mode : undefined,
        })
      ).data,
    enabled: !!campaignId,
    refetchInterval: 60_000,
  });
}

export function useCampaignAlerts(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign", campaignId, "alerts"],
    queryFn: async () => (await dashboardApi.alerts(campaignId!)).data,
    enabled: !!campaignId,
    refetchInterval: 60_000,
  });
}

/** Newest-first activity, advanced with the returned cursor. */
export function useActivityFeed(campaignId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["campaign", campaignId, "activity"],
    queryFn: async ({ pageParam }) =>
      (await dashboardApi.activity(campaignId!, { limit: ACTIVITY_PAGE, cursor: pageParam })).data,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled: !!campaignId,
  });
}

export function useCampaignAnalytics(
  campaignId: string | undefined,
  range: { from: string; to: string },
) {
  return useQuery({
    queryKey: ["campaign", campaignId, "analytics", range.from, range.to],
    queryFn: async () => (await dashboardApi.analytics(campaignId!, range)).data,
    enabled: !!campaignId,
  });
}

export function useGeographicOverview(campaignId: string | undefined, unitId: string | null) {
  return useQuery({
    queryKey: ["campaign", campaignId, "geographic-overview", unitId],
    queryFn: async () => (await dashboardApi.geographicOverview(campaignId!, unitId!)).data,
    enabled: !!campaignId && !!unitId,
  });
}

/** Published occasions only: reports and summaries need a published one. */
export function usePollingOccasions() {
  return useQuery({
    queryKey: ["catalog", "polling-occasions"],
    queryFn: async () =>
      (await dashboardApi.pollingOccasions()).data.filter((o) => o.status === "published"),
    staleTime: 10 * 60_000,
  });
}
