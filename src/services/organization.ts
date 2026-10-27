import { API } from "./api";
import { getList, getMethod, postMethod } from "./requests";
import type { ApiUser } from "./auth";
import type { ApiFieldReport, ApiTask, Assignment } from "./operations";
import type { CampaignRole } from "./auth";

export interface Membership {
  id: string;
  organization_id: string;
  user_id: string;
  role: CampaignRole;
  status: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentActivity {
  assignment_id: string;
  membership_id: string;
  user_id: string;
  name: string;
  geographic_unit_id: string;
  duty: string;
  assigned_at: string;
  last_heartbeat_at: string | null;
  tasks: { total: number; open: number; completed: number };
  reports: { field: number; polling: number };
  last_report_received_at: string | null;
}

export interface AgentActivityPage {
  campaign_id: string;
  as_of: string;
  source_label: string;
  agents: AgentActivity[];
  pagination: { current_page: number; last_page: number; total: number };
}

export interface AgentProfile {
  id: string;
  organization_id: string;
  membership_id: string;
  geography_version_id: string;
  home_geographic_unit_id: string | null;
  phone: string | null;
  status: string;
  created_at: string;
}

/** One agent's campaign view: identity, assignments, stats and recent work. */
export interface AgentDetail {
  user: ApiUser;
  membership_id: string;
  agent_profile: AgentProfile | null;
  assignments: Assignment[];
  stats: {
    tasks_total: number;
    tasks_completed: number;
    task_completion_percent: number | null;
    field_reports: number;
    polling_reports: number;
    incidents: number;
  };
  recent_tasks: ApiTask[];
  recent_field_reports: ApiFieldReport[];
}

export interface StaffInvitationPayload {
  name: string;
  email: string;
  role: string;
  phone?: string;
  geography_version_id?: string;
  home_geographic_unit_id?: string;
  campaign_id?: string;
}

export const organizationApi = {
  memberships: (organizationId: string) =>
    getList<Membership>(API.organization.memberships(organizationId)),
  agentActivity: (campaignId: string, query?: { page?: number }) =>
    getMethod<AgentActivityPage>(API.campaign.agentActivity(campaignId), query),
  agent: (campaignId: string, membershipId: string) =>
    getMethod<AgentDetail>(API.campaign.agent(campaignId, membershipId)),
  /** The response carries a one-time acceptance token; it can't be fetched again. */
  invite: (organizationId: string, payload: StaffInvitationPayload) =>
    postMethod<Record<string, unknown>>(API.organization.staffInvitations(organizationId), payload),
  assign: (
    campaignId: string,
    payload: { agent_membership_id: string; geographic_unit_id: string; duty: string },
  ) => postMethod<Assignment>(API.campaign.assignments(campaignId), payload),
  endAssignment: (assignmentId: string) => postMethod<Assignment>(API.assignment.end(assignmentId)),
};
