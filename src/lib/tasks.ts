import type { Priority, TaskCategory } from "./data";
import type { ApiPriority, ApiTaskCategory, ApiTaskStatus, CollectionMethod } from "../services/operations";
import type { ReportType } from "./data";
import { humanize, parseApiDate } from "./format";

/** Board status labels; "Cancelled" is the API state the mock board never had. */
export type BoardStatus = "Pending" | "In Progress" | "Completed" | "Cancelled";

export const STATUS_LABEL: Record<ApiTaskStatus, BoardStatus> = {
  open: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PRIORITY_LABEL: Record<ApiPriority, Priority> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const PRIORITY_CODE: Record<Priority, ApiPriority> = {
  High: "high",
  Medium: "medium",
  Low: "low",
};

export const CATEGORY_CODE: Record<TaskCategory, ApiTaskCategory> = {
  "Opinion Poll": "opinion_poll",
  "Election Report": "election_report",
  "Incident Report": "incident_report",
};

export const CATEGORY_LABEL: Record<ApiTaskCategory, TaskCategory> = {
  opinion_poll: "Opinion Poll",
  election_report: "Election Report",
  incident_report: "Incident Report",
};

/**
 * Subject codes per the integration guide; election and incident codes are
 * the ones the field app maps to its report forms. `subject` is free text in
 * the API, so opinion-poll codes are ours.
 */
export const SUBJECT_CODE: Record<string, string> = {
  "Candidate preference & reasons": "candidate_preference",
  "Why voters rate our candidate best": "why_rate_candidate",
  "Perception of rival candidates": "rival_perception",
  "Top issues driving the choice": "top_issues",
  "Undecided voter sentiment": "undecided_sentiment",

  "Ward voter accreditation": "ward_accreditation",
  "Votes cast at the ward": "votes_cast",
  "Polling unit opening status": "polling_unit_opening",
  "Result collation at ward": "result_collation",
  "BVAS & materials status": "bvas_materials",

  "Election violence": "election_violence",
  "Voter intimidation": "voter_intimidation",
  "Vote buying": "vote_buying",
  "Ballot box snatching": "ballot_box_snatching",
  "Underage voting": "underage_voting",
  "Late or missing materials": "late_or_missing_materials",
};

const SUBJECT_LABEL = Object.fromEntries(
  Object.entries(SUBJECT_CODE).map(([label, code]) => [code, label]),
);

export function subjectLabel(code: string | null | undefined): string {
  if (!code) return "";
  return SUBJECT_LABEL[code] ?? humanize(code);
}

export const METHOD_LABEL: Record<CollectionMethod, ReportType> = {
  rally: "Rally",
  door_to_door: "Door-to-Door",
  town_hall: "Town Hall",
  media: "Media",
  distribution: "Distribution",
};

/** "Today", "Tomorrow", otherwise "Wed 17 Sep". */
export function formatDue(value: string | null | undefined, now = new Date()): string {
  const d = parseApiDate(value);
  if (!d) return "No due date";
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** End of the chosen local day, as an ISO timestamp the API accepts. */
export function dueAtFromDate(isoDate: string): string {
  return new Date(`${isoDate}T23:59:00`).toISOString();
}
