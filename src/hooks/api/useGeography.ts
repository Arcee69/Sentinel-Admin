import { useQuery } from "@tanstack/react-query";
import { geographyApi, type GeoUnit } from "../../services/geography";
import type { ContextCampaign } from "../../services/auth";

/** Units change only when a geography version is republished. */
export const GEO_STALE = 60 * 60_000;

export const unitsKey = (versionId: string | undefined, parentId?: string | null) =>
  ["geography", versionId, "units", parentId ?? "root"] as const;

export function useGeoUnits(versionId: string | undefined, parentId?: string | null) {
  return useQuery({
    queryKey: unitsKey(versionId, parentId),
    queryFn: async () =>
      (await geographyApi.units(versionId!, parentId ? { parent_id: parentId } : undefined)).data,
    enabled: !!versionId,
    staleTime: GEO_STALE,
  });
}

/**
 * The states a campaign covers. A campaign scoped to the country gets every
 * state under it; one scoped to particular states gets just those.
 */
export function useCampaignStates(campaign: ContextCampaign | null) {
  const versionId = campaign?.geography_version_id;

  return useQuery({
    queryKey: ["geography", versionId, "campaign-states", campaign?.scope_unit_ids ?? []],
    enabled: !!campaign,
    staleTime: GEO_STALE,
    queryFn: async (): Promise<{ roots: GeoUnit[]; states: GeoUnit[] }> => {
      const scope = new Set(campaign!.scope_unit_ids);
      const roots = (await geographyApi.units(versionId!)).data;
      const children = await Promise.all(
        roots.map(async (r) => (await geographyApi.units(versionId!, { parent_id: r.id })).data),
      );
      const all = children.flat().filter((u) => u.kind === "state");
      const wholeCountry = roots.some((r) => scope.has(r.id));
      return {
        roots,
        states: (wholeCountry ? all : all.filter((s) => scope.has(s.id))).sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      };
    },
  });
}
