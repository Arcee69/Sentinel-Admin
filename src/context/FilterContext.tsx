import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ALL_STATES, statesForCampaign, type Campaign } from "../lib/campaigns";
import { useAuth, type WorkspaceCampaign } from "./AuthContext";
import { useCampaignStates } from "../hooks/api/useGeography";
import type { GeoUnit } from "../services/geography";

const STORAGE_KEY = "sentinel.filters";

interface FilterValue {
  /** The selected campaign as returned by `/auth/context`. */
  apiCampaign: WorkspaceCampaign | null;
  /** Every back-office campaign the user can switch to. */
  campaigns: WorkspaceCampaign[];
  setCampaign: (id: string) => void;

  /** States the scope picker offers for this campaign (from the geography API). */
  stateUnits: GeoUnit[];
  stateUnitsLoading: boolean;
  /** The country/root units of the campaign's geography version. */
  rootUnits: GeoUnit[];
  /** Selected state, or null for the whole campaign. */
  scopeUnit: GeoUnit | null;
  /** Label for the scope button. */
  scopeLabel: string;
  setScopeUnit: (id: string | null) => void;
  reset: () => void;

  /*
   * Legacy fields for screens still on mock data. Mock records are keyed by
   * Nigerian state names, which can't be matched to API unit IDs, so those
   * screens always see the campaign nationwide until they are integrated.
   */
  campaign: Campaign;
  campaignId: string;
  scope: string;
  availableStates: string[];
  activeStates: Set<string>;
  isNationwide: boolean;
}

const FilterContext = createContext<FilterValue | null>(null);

const NO_CAMPAIGN: Campaign = {
  id: "",
  name: "No campaign",
  party: "",
  cycle: "",
  scopeLabel: "",
  states: null,
};

function toLegacyCampaign(c: WorkspaceCampaign): Campaign {
  return {
    id: c.id,
    name: c.name,
    party: c.party ?? "",
    cycle: c.cycle ?? "",
    scopeLabel: c.office ?? "Campaign scope",
    states: null,
  };
}

function readStoredScope(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return (JSON.parse(raw) as { scopeUnitId?: string | null }).scopeUnitId ?? null;
  } catch {
    /* fall through to default */
  }
  return null;
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const { campaigns, activeCampaign, selectCampaign } = useAuth();
  const [storedScope, setStoredScope] = useState(readStoredScope);
  const statesQuery = useCampaignStates(activeCampaign);

  const persistScope = useCallback((scopeUnitId: string | null) => {
    setStoredScope(scopeUnitId);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ scopeUnitId }));
    } catch {
      /* storage unavailable — filters stay in memory only */
    }
  }, []);

  const value = useMemo<FilterValue>(() => {
    const campaign = activeCampaign ? toLegacyCampaign(activeCampaign) : NO_CAMPAIGN;
    const stateUnits = statesQuery.data?.states ?? [];
    // A scope left over from another campaign falls back to the whole campaign.
    const scopeUnit = stateUnits.find((s) => s.id === storedScope) ?? null;
    const legacyStates = statesForCampaign(campaign);

    return {
      apiCampaign: activeCampaign,
      campaigns,
      setCampaign: (id) => {
        if (id !== activeCampaign?.id) persistScope(null);
        selectCampaign(id);
      },

      stateUnits,
      stateUnitsLoading: statesQuery.isLoading,
      rootUnits: statesQuery.data?.roots ?? [],
      scopeUnit,
      scopeLabel: scopeUnit?.name ?? "All States",
      setScopeUnit: persistScope,
      reset: () => persistScope(null),

      campaign,
      campaignId: campaign.id,
      scope: ALL_STATES,
      availableStates: legacyStates,
      activeStates: new Set(legacyStates),
      isNationwide: true,
    };
  }, [activeCampaign, campaigns, statesQuery.data, statesQuery.isLoading, storedScope, persistScope, selectCampaign]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFilters(): FilterValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used inside <FilterProvider>");
  return ctx;
}
