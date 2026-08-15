import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  ALL_STATES,
  CAMPAIGNS,
  DEFAULT_CAMPAIGN_ID,
  getCampaign,
  statesForCampaign,
  type Campaign,
} from "../lib/campaigns";

const STORAGE_KEY = "sentinel.filters";

interface FilterValue {
  campaign: Campaign;
  campaignId: string;
  /** Selected state name, or ALL_STATES. */
  scope: string;
  /** Label for the scope button. */
  scopeLabel: string;
  /** States the picker should offer for the current campaign. */
  availableStates: string[];
  /**
   * The effective geography: one state when scoped, otherwise every state in
   * the campaign. Pages filter against this rather than reading scope directly.
   */
  activeStates: Set<string>;
  /** True when no single state is selected. */
  isNationwide: boolean;
  setCampaign: (id: string) => void;
  setScope: (state: string) => void;
  reset: () => void;
}

const FilterContext = createContext<FilterValue | null>(null);

function readStored(): { campaignId: string; scope: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { campaignId?: string; scope?: string };
      const campaignId = CAMPAIGNS.some((c) => c.id === parsed.campaignId)
        ? parsed.campaignId!
        : DEFAULT_CAMPAIGN_ID;
      return { campaignId, scope: parsed.scope ?? ALL_STATES };
    }
  } catch {
    /* fall through to defaults */
  }
  return { campaignId: DEFAULT_CAMPAIGN_ID, scope: ALL_STATES };
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(readStored);

  const persist = useCallback((next: { campaignId: string; scope: string }) => {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — filters stay in memory only */
    }
  }, []);

  const value = useMemo<FilterValue>(() => {
    const campaign = getCampaign(state.campaignId);
    const availableStates = statesForCampaign(campaign);

    // A scope left over from another campaign is treated as nationwide rather
    // than filtering everything to nothing.
    const scope = availableStates.includes(state.scope) ? state.scope : ALL_STATES;
    const isNationwide = scope === ALL_STATES;

    return {
      campaign,
      campaignId: campaign.id,
      scope,
      scopeLabel: isNationwide
        ? campaign.states
          ? campaign.scopeLabel
          : "All States"
        : scope,
      availableStates,
      activeStates: new Set(isNationwide ? availableStates : [scope]),
      isNationwide,
      setCampaign: (id) => {
        // Changing campaign clears a now-invalid state selection.
        const next = getCampaign(id);
        const keep = statesForCampaign(next).includes(state.scope) ? state.scope : ALL_STATES;
        persist({ campaignId: id, scope: keep });
      },
      setScope: (next) => persist({ campaignId: state.campaignId, scope: next }),
      reset: () => persist({ campaignId: DEFAULT_CAMPAIGN_ID, scope: ALL_STATES }),
    };
  }, [state, persist]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFilters(): FilterValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used inside <FilterProvider>");
  return ctx;
}
