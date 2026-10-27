/**
 * Shared UI vocabulary for SMHP Sentinel: labels, option lists and the
 * display types screens map API records onto. Records themselves come
 * from the API (see `src/services`).
 */

export { LGAS_BY_STATE, STATE_ACTIVITY } from "./states";
export type { StateActivity } from "./states";

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export type Trend = "up" | "down";

/* ------------------------------------------------------------------ */
/* Campaign Ops                                                        */
/* ------------------------------------------------------------------ */

export type Priority = "High" | "Medium" | "Low";

/** The three kinds of work a field agent is dispatched to do. */
export type TaskCategory = "Opinion Poll" | "Election Report" | "Incident Report";

export interface TaskCategoryDef {
  id: TaskCategory;
  blurb: string;
  /** What the agent is asked to collect or report on. */
  subjects: string[];
}

export const TASK_CATEGORIES: TaskCategoryDef[] = [
  {
    id: "Opinion Poll",
    blurb: "Gather voter feedback on the candidates and why they rate them best.",
    subjects: [
      "Candidate preference & reasons",
      "Why voters rate our candidate best",
      "Perception of rival candidates",
      "Top issues driving the choice",
      "Undecided voter sentiment",
    ],
  },
  {
    id: "Election Report",
    blurb: "Report ward-level accreditation, turnout and collation.",
    subjects: [
      "Ward voter accreditation",
      "Votes cast at the ward",
      "Polling unit opening status",
      "Result collation at ward",
      "BVAS & materials status",
    ],
  },
  {
    id: "Incident Report",
    blurb: "Flag violence, intimidation, vote buying and other malpractice.",
    subjects: [
      "Election violence",
      "Voter intimidation",
      "Vote buying",
      "Ballot box snatching",
      "Underage voting",
      "Late or missing materials",
    ],
  },
];

export const REPORT_TYPES = [
  "Rally",
  "Door-to-Door",
  "Town Hall",
  "Media",
  "Distribution",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

/* ------------------------------------------------------------------ */
/* Distribution                                                        */
/* ------------------------------------------------------------------ */

export const CHANNELS = [
  { name: "WhatsApp Groups", active: 1842, reach: "612k", tone: "accent" as const },
  { name: "Telegram Channels", active: 248, reach: "284k", tone: "info" as const },
  { name: "SMS Broadcasts", active: 36, reach: "1.4M", tone: "warning" as const },
];

export const AUDIENCES = ["All", "Youth", "Traders", "Civil", "Swing"] as const;

export type CampaignStatus = "Viral" | "Delivered" | "Sent" | "Draft";

/* ------------------------------------------------------------------ */
/* Command Center                                                      */
/* ------------------------------------------------------------------ */

export type PuStatus = "Open" | "Delayed" | "Issue" | "Closed";

export type IncidentSeverity = "Critical" | "High" | "Medium" | "Low";
export type IncidentStatus = "Open" | "Escalated" | "Resolved";

/* ------------------------------------------------------------------ */
/* Agents & Structure                                                  */
/* ------------------------------------------------------------------ */

export type AgentStatus = "active" | "idle" | "offline";

export const AGENT_ROLES = [
  "LGA Supervisor",
  "Ward Coordinator",
  "Field Agent",
] as const;

export type AgentRole = (typeof AGENT_ROLES)[number];

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */


export const PLATFORM_ROLES = [
  "national_admin",
  "state_coordinator",
  "field_agent",
  "observer",
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const ROLE_LABELS: Record<PlatformRole, string> = {
  national_admin: "National Admin",
  state_coordinator: "State Coordinator",
  field_agent: "Field Agent",
  observer: "Observer",
};

export const PERMISSIONS = [
  { capability: "View all states", admin: true, state: false, agent: false, observer: true },
  { capability: "Create campaigns", admin: true, state: false, agent: false, observer: false },
  { capability: "Manage users & roles", admin: true, state: false, agent: false, observer: false },
  { capability: "Manage agents", admin: true, state: true, agent: false, observer: false },
  { capability: "Submit field reports", admin: true, state: true, agent: true, observer: false },
  { capability: "Flag incidents", admin: true, state: true, agent: true, observer: false },
  { capability: "Send distribution", admin: true, state: true, agent: false, observer: false },
];

/* Permission simulator ---------------------------------------------- */

export type DataAccess = "none" | "view" | "edit";
export type DataScope = "all" | "state" | "own";

export interface AccessRule {
  access: DataAccess;
  scope: DataScope;
}

export const DATA_ACCESS_LEVELS: DataAccess[] = ["none", "view", "edit"];

export const ACCESS_LABELS: Record<DataAccess, string> = {
  none: "No access",
  view: "View",
  edit: "View & edit",
};

export const SCOPE_LABELS: Record<DataScope, string> = {
  all: "All states",
  state: "Own state",
  own: "Own records",
};

export const DATA_AREAS = [
  { key: "campaigns", label: "Campaigns" },
  { key: "campaign_activities", label: "Campaign activities" },
  { key: "incidents", label: "Incidents" },
  { key: "field_reports", label: "Field reports" },
  { key: "field_tasks", label: "Field tasks" },
  { key: "polling_units", label: "Polling units & turnout" },
  { key: "broadcasts", label: "Distribution messages" },
  { key: "users", label: "Users & roles" },
  { key: "audit", label: "Audit log" },
] as const;

export type DataAreaKey = (typeof DATA_AREAS)[number]["key"];

export type RolePolicy = Record<DataAreaKey, AccessRule>;

/** The access policy each role holds today. */
export const ROLE_POLICIES: Record<PlatformRole, RolePolicy> = {
  national_admin: Object.fromEntries(
    DATA_AREAS.map((a) => [a.key, { access: "edit", scope: "all" }]),
  ) as RolePolicy,
  state_coordinator: {
    campaigns: { access: "view", scope: "all" },
    campaign_activities: { access: "edit", scope: "state" },
    incidents: { access: "edit", scope: "state" },
    field_reports: { access: "edit", scope: "state" },
    field_tasks: { access: "edit", scope: "state" },
    polling_units: { access: "edit", scope: "state" },
    broadcasts: { access: "edit", scope: "state" },
    users: { access: "none", scope: "state" },
    audit: { access: "none", scope: "state" },
  },
  field_agent: {
    campaigns: { access: "view", scope: "all" },
    campaign_activities: { access: "view", scope: "state" },
    incidents: { access: "edit", scope: "state" },
    field_reports: { access: "edit", scope: "own" },
    field_tasks: { access: "view", scope: "own" },
    polling_units: { access: "edit", scope: "state" },
    broadcasts: { access: "view", scope: "state" },
    users: { access: "none", scope: "own" },
    audit: { access: "none", scope: "own" },
  },
  observer: {
    campaigns: { access: "view", scope: "all" },
    campaign_activities: { access: "view", scope: "all" },
    incidents: { access: "view", scope: "all" },
    field_reports: { access: "view", scope: "all" },
    field_tasks: { access: "view", scope: "all" },
    polling_units: { access: "view", scope: "all" },
    broadcasts: { access: "view", scope: "all" },
    users: { access: "none", scope: "all" },
    audit: { access: "none", scope: "all" },
  },
};
