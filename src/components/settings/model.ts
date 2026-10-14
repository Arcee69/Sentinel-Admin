import { STATE_ACTIVITY } from "../../lib/states";
import type { Campaign } from "../../lib/campaigns";

/** Every state, alphabetised for pickers. */
export const STATE_OPTIONS = STATE_ACTIVITY.map((s) => s.name).sort((a, b) => a.localeCompare(b));

export const SETUP_STATUSES = ["draft", "active", "paused", "archived"] as const;
export type SetupStatus = (typeof SETUP_STATUSES)[number];

/** A campaign plus the setup details the global filter doesn't need. */
export interface CampaignRecord extends Campaign {
  candidate: string;
  office: string;
  status: SetupStatus;
  startDate: string;
  endDate: string;
}

export function toRecord(c: Campaign): CampaignRecord {
  return { ...c, candidate: "", office: "", status: "active", startDate: "", endDate: "" };
}
