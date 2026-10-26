import { useQuery } from "@tanstack/react-query";
import { intelligenceApi } from "../../services/intelligence";

export function useIntelligenceSummary(
  campaignId: string | undefined,
  params: { from: string; to: string; unitId?: string | null },
  enabled = true,
) {
  const { from, to, unitId } = params;
  return useQuery({
    queryKey: ["campaign", campaignId, "intelligence-summary", from, to, unitId ?? null],
    queryFn: async () =>
      (
        await intelligenceApi.summary(campaignId!, {
          from,
          to,
          geographic_unit_id: unitId ?? undefined,
        })
      ).data,
    enabled: !!campaignId && enabled,
  });
}
