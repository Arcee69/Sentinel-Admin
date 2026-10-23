import { useMemo } from "react";
import { useFilters } from "../context/FilterContext";

/**
 * Names for the geographic units already loaded for the scope picker
 * (country and states). Deeper units (LGA/ward/polling unit) resolve to
 * undefined; callers omit the place rather than show a raw ID.
 */
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

export function useUnitNames() {
  const { stateUnits, rootUnits } = useFilters();
  return useMemo(() => {
    const names = new Map([...rootUnits, ...stateUnits].map((u) => [u.id, u.name]));
    return (id: string | null | undefined) => (id ? names.get(id) : undefined);
  }, [stateUnits, rootUnits]);
}
