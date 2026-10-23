import { STATE_ACTIVITY, type StateActivity } from "./data";
import type { StateFieldActivity } from "../services/dashboard";

/** "Lagos State", "LAGOS", "FCT - Abuja" → one key, to join API states to map shapes. */
function stateKey(name: string): string {
  const s = name.toLowerCase().replace(/\bstate\b/g, "").replace(/[^a-z]/g, "");
  if (s.includes("fct") || s.includes("abuja") || s.includes("federalcapital")) return "fct";
  return s;
}

const SHAPES_BY_KEY = new Map(STATE_ACTIVITY.map((s) => [stateKey(s.name), s]));

/**
 * API state report counts in the `StateActivity` shape the charts draw.
 * States are joined to the Nigeria shapes by name. `includeUnmapped` keeps
 * states with no shape (e.g. a demo geography) under their official code —
 * fine for the tile grid, but the map must leave them off.
 */
export function toStateActivity(
  rows: StateFieldActivity[],
  { includeUnmapped = false, onlyUnitId }: { includeUnmapped?: boolean; onlyUnitId?: string } = {},
): StateActivity[] {
  const out: StateActivity[] = [];
  for (const r of rows) {
    if (onlyUnitId && r.geographic_unit_id !== onlyUnitId) continue;
    const shape = SHAPES_BY_KEY.get(stateKey(r.name));
    if (!shape && !includeUnmapped) continue;
    out.push({
      code: shape?.code ?? r.official_code,
      name: shape?.name ?? r.name,
      zone: shape?.zone ?? "North Central",
      lgas: shape?.lgas ?? [],
      activity: r.reports,
      reports: r.reports,
      reach: 0,
      agents: 0,
      sentiment: 0,
    });
  }
  return out;
}
