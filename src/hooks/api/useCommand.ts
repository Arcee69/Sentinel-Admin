import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { commandApi, type IncidentTransitionPayload } from "../../services/command";
import { getAllPages } from "../../services/requests";
import { API } from "../../services/api";

/** Polling-day data moves quickly; poll it while the screen is open. */
const LIVE_REFRESH = 30_000;

export function useCommandPollingUnits(
  campaignId: string | undefined,
  pollingOccasionId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["campaign", campaignId, "command-polling-units", pollingOccasionId],
    queryFn: async () => (await commandApi.pollingUnits(campaignId!, pollingOccasionId!)).data,
    enabled: !!campaignId && !!pollingOccasionId,
    refetchInterval: LIVE_REFRESH,
  });
}

export function useIncidents(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign", campaignId, "incidents"],
    queryFn: () => commandApi.incidents(campaignId!),
    enabled: !!campaignId,
    refetchInterval: LIVE_REFRESH,
  });
}

/** Only the geography link is needed here, so the list's other fields go untyped. */
export function usePollingReportUnits(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign", campaignId, "polling-reports"],
    queryFn: () =>
      getAllPages<{ id: string; polling_unit_id: string | null }>(
        API.campaign.pollingReports(campaignId!),
      ),
    enabled: !!campaignId,
    refetchInterval: LIVE_REFRESH,
  });
}

export function useIncidentTransition(campaignId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ incidentId, ...payload }: IncidentTransitionPayload & { incidentId: string }) =>
      (await commandApi.transition(incidentId, payload)).data,
    // Refetch on failure too: a 409 means the incident moved on without us.
    onSettled: () => {
      for (const key of ["incidents", "alerts", "overview", "activity"]) {
        void queryClient.invalidateQueries({ queryKey: ["campaign", campaignId, key] });
      }
    },
  });
}
