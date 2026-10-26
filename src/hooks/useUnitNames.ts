import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFilters } from "../context/FilterContext";
import { geographyApi, type GeoUnit } from "../services/geography";
import { GEO_STALE, unitsKey } from "./api/useGeography";

/**
 * Whether a record's unit falls in the topbar scope. Records tagged with the
 * selected state (or with no unit) pass; records on a different known state
 * are dropped. Units below state level can't be placed without walking the
 * hierarchy, so they are kept rather than hidden.
 */
export function useInScope() {
  const { scopeUnit, stateUnits } = useFilters();
  return useMemo(() => {
    const states = new Set(stateUnits.map((s) => s.id));
    return (unitId: string | null | undefined) =>
      !scopeUnit || !unitId || unitId === scopeUnit.id || !states.has(unitId);
  }, [scopeUnit, stateUnits]);
}

/**
 * Names for the geographic units already loaded for the scope picker
 * (country and states). Deeper units (LGA/ward/polling unit) resolve to
 * undefined; callers omit the place rather than show a raw ID.
 */
export function useUnitNames() {
  const { stateUnits, rootUnits } = useFilters();
  return useMemo(() => {
    const names = new Map([...rootUnits, ...stateUnits].map((u) => [u.id, u.name]));
    return (id: string | null | undefined) => (id ? names.get(id) : undefined);
  }, [stateUnits, rootUnits]);
}

/** Most child-list requests one lookup may make per level before giving up. */
const LINEAGE_MAX_FANOUT = 40;

export interface UnitLineage {
  unit: GeoUnit;
  state?: GeoUnit;
  lga?: GeoUnit;
  ward?: GeoUnit;
}

/**
 * Resolves unit IDs (e.g. polling units on incidents) to their state, LGA
 * and ward. The API lists units only by parent and has no ancestor lookup,
 * so this walks down from the campaign's states one level at a time, stopping
 * once every ID is found or a level gets too wide. Unresolved IDs return
 * undefined. Child lists share the `useGeoUnits` cache.
 */
export function useUnitLineage(unitIds: (string | null | undefined)[]) {
  const queryClient = useQueryClient();
  const { apiCampaign, stateUnits } = useFilters();
  const versionId = apiCampaign?.geography_version_id;
  const wanted = useMemo(
    () => [...new Set(unitIds.filter((id): id is string => !!id))].sort(),
    [unitIds],
  );

  const query = useQuery({
    queryKey: ["geography", versionId, "lineage", wanted],
    enabled: !!versionId && stateUnits.length > 0 && wanted.length > 0,
    staleTime: GEO_STALE,
    queryFn: async () => {
      const byId = new Map(stateUnits.map((u) => [u.id, u]));
      let frontier = stateUnits;
      const missing = () => wanted.some((id) => !byId.has(id));

      // state → LGA → ward → polling unit
      for (let depth = 0; depth < 3 && missing() && frontier.length; depth++) {
        if (frontier.length > LINEAGE_MAX_FANOUT) break;
        const children = await Promise.all(
          frontier.map((parent) =>
            queryClient.fetchQuery({
              queryKey: unitsKey(versionId, parent.id),
              queryFn: async () =>
                (await geographyApi.units(versionId!, { parent_id: parent.id })).data,
              staleTime: GEO_STALE,
            }),
          ),
        );
        frontier = children.flat();
        for (const u of frontier) byId.set(u.id, u);
      }
      return [...byId.values()];
    },
  });

  return useMemo(() => {
    const byId = new Map((query.data ?? stateUnits).map((u) => [u.id, u]));
    return (id: string | null | undefined): UnitLineage | undefined => {
      const unit = id ? byId.get(id) : undefined;
      if (!unit) return undefined;
      const lineage: UnitLineage = { unit };
      for (let u: GeoUnit | undefined = unit; u; u = u.parent_id ? byId.get(u.parent_id) : undefined) {
        if (u.kind === "state") lineage.state = u;
        else if (u.kind === "lga") lineage.lga = u;
        else if (u.kind === "ward") lineage.ward = u;
      }
      return lineage;
    };
  }, [query.data, stateUnits]);
}
