import type { AgentRole, AgentStatus } from "./data";
import { humanize, parseApiDate } from "./format";

/** Assignment duties the API accepts, in the roster's role vocabulary. */
export const DUTY_LABEL: Record<string, AgentRole> = {
  field_agent: "Field Agent",
  lga_supervisor: "LGA Supervisor",
  ward_coordinator: "Ward Coordinator",
};

export const DUTY_CODE: Record<AgentRole, string> = {
  "Field Agent": "field_agent",
  "LGA Supervisor": "lga_supervisor",
  "Ward Coordinator": "ward_coordinator",
};

export function dutyLabel(duty: string | null | undefined): string {
  if (!duty) return "Agent";
  return DUTY_LABEL[duty] ?? humanize(duty);
}

/** A heartbeat this recent means the agent is on shift right now. */
const ACTIVE_MS = 30 * 60_000;
/** Within a day they're around but quiet; beyond that, offline. */
const IDLE_MS = 24 * 60 * 60_000;

/** Presence from the latest field-app heartbeat; no heartbeat at all is offline. */
export function presenceOf(lastHeartbeatAt: string | null | undefined, now = Date.now()): AgentStatus {
  const beat = parseApiDate(lastHeartbeatAt);
  if (!beat) return "offline";
  const age = now - beat.getTime();
  if (age <= ACTIVE_MS) return "active";
  if (age <= IDLE_MS) return "idle";
  return "offline";
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
