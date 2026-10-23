import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { communicationsApi, type CreateBroadcastPayload } from "../../services/communications";

export const commsKeys = {
  broadcasts: (c?: string) => ["campaign", c, "broadcasts"] as const,
};

export function useBroadcasts(campaignId: string | undefined) {
  return useQuery({
    queryKey: commsKeys.broadcasts(campaignId),
    queryFn: () => communicationsApi.broadcasts(campaignId!),
    enabled: !!campaignId,
    refetchInterval: 60_000,
  });
}

/** Published notices land in staff notifications and the activity stream. */
function invalidateBroadcastViews(queryClient: ReturnType<typeof useQueryClient>, campaignId: string) {
  for (const key of ["broadcasts", "notifications", "activity", "overview"]) {
    void queryClient.invalidateQueries({ queryKey: ["campaign", campaignId, key] });
  }
}

export function useCreateBroadcast(campaignId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateBroadcastPayload) =>
      (await communicationsApi.create(campaignId!, payload)).data,
    onSettled: () => invalidateBroadcastViews(queryClient, campaignId!),
  });
}

export function usePublishBroadcast(campaignId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (broadcastId: string) => (await communicationsApi.publish(broadcastId)).data,
    onSettled: () => invalidateBroadcastViews(queryClient, campaignId!),
  });
}
