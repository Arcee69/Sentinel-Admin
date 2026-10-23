import { useMemo } from "react";
import { useFilters } from "../context/FilterContext";

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
