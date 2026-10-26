import { API } from "./api";
import { getAllPages, getMethod, postMethod } from "./requests";

export type OperatingStatus = "open" | "delayed" | "closed" | (string & {});
export type ReviewState = "pending_review" | "verified" | "rejected" | (string & {});

/** Latest observed report per polling unit for one occasion. */
export interface CommandPollingUnit {
  /** The polling report's ID. */
  id: string;
  polling_place_id: string;
  polling_occasion_id: string;
  operating_status: OperatingStatus | null;
  subject: string | null;
  reported_votes_cast: number | null;
  review_state: ReviewState;
  received_at: string;
  official_code: string;
  name: string;
  registered_count: number | null;
  accredited_persons: number | null;
  participating_persons: number | null;
}

export interface CommandPollingUnits {
  campaign_id: string;
  as_of: string;
  source_label: string;
  polling_units: CommandPollingUnit[];
}

export type IncidentStatus = "open" | "escalated" | "resolved" | (string & {});
export type IncidentSeverityCode = "critical" | "high" | "medium" | "low";
export type IncidentAction = "assign" | "escalate" | "resolve" | "reopen";

export interface ApiIncident {
  id: string;
  organization_id: string;
  campaign_id: string;
  reporter_membership_id: string | null;
  assigned_membership_id: string | null;
  geographic_unit_id: string | null;
  polling_occasion_id: string | null;
  polling_place_id: string | null;
  polling_report_id: string | null;
  category: string | null;
  incident_type: string | null;
  latitude: number | null;
  longitude: number | null;
  client_submission_id: string | null;
  severity: IncidentSeverityCode;
  description: string;
  status: IncidentStatus;
  /** Send back as `expected_revision` on every transition. */
  revision: number;
  occurred_at: string;
}

export interface IncidentEvent {
  id: string;
  incident_id: string;
  actor_membership_id: string | null;
  action: string;
  previous_status: IncidentStatus | null;
  next_status: IncidentStatus;
  reason: string | null;
  revision: number;
  occurred_at: string;
}

export interface IncidentTransitionPayload {
  action: IncidentAction;
  reason: string;
  expected_revision: number;
  /** Required for `assign`. */
  assigned_membership_id?: string;
}

export const commandApi = {
  pollingUnits: (campaignId: string, pollingOccasionId: string) =>
    getMethod<CommandPollingUnits>(API.campaign.commandPollingUnits(campaignId), {
      polling_occasion_id: pollingOccasionId,
    }),
  incidents: (campaignId: string) => getAllPages<ApiIncident>(API.campaign.incidents(campaignId)),
  incident: (incidentId: string) => getMethod<ApiIncident>(API.incident.show(incidentId)),
  incidentEvents: (incidentId: string) =>
    getAllPages<IncidentEvent>(API.incident.events(incidentId)),
  transition: (incidentId: string, payload: IncidentTransitionPayload) =>
    postMethod<ApiIncident>(API.incident.transitions(incidentId), payload),
};
