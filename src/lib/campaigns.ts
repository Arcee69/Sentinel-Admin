import { NORTHERN_ZONES, STATE_ACTIVITY } from "./states";

/**
 * A campaign owns a geography. Selecting one narrows both the data and the
 * states the scope picker will offer, so the two filters can never be set to
 * a contradictory pair (e.g. the Lagos race scoped to Kano).
 */
export interface Campaign {
  id: string;
  name: string;
  party: string;
  cycle: string;
  /** Human-readable geography, shown in the picker. */
  scopeLabel: string;
  /** State names this campaign runs in; `null` means nationwide. */
  states: string[] | null;
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: "c1",
    name: "Renewed Mandate 2027",
    party: "SMHP",
    cycle: "2027 Presidential",
    scopeLabel: "36 states + FCT",
    states: null,
  },
  {
    id: "c2",
    name: "Lagos Gubernatorial Drive",
    party: "SMHP",
    cycle: "2027 State",
    scopeLabel: "Lagos only",
    states: ["Lagos"],
  },
  {
    id: "c3",
    name: "Northern Outreach",
    party: "SMHP",
    cycle: "2026 By-election",
    scopeLabel: "Northern zones",
    states: STATE_ACTIVITY.filter((s) => NORTHERN_ZONES.includes(s.zone)).map((s) => s.name),
  },
];

export const DEFAULT_CAMPAIGN_ID = "c1";

/** Sentinel value for the scope picker's "everything in this campaign" option. */
export const ALL_STATES = "__all__";

export function getCampaign(id: string): Campaign {
  return CAMPAIGNS.find((c) => c.id === id) ?? CAMPAIGNS[0];
}

/** State names a campaign covers, in the roster's activity order. */
export function statesForCampaign(campaign: Campaign): string[] {
  const names = STATE_ACTIVITY.map((s) => s.name);
  if (!campaign.states) return names;
  const allowed = new Set(campaign.states);
  return names.filter((n) => allowed.has(n));
}
