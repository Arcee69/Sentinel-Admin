import { API } from "./api";
import { getList, getMethod } from "./requests";
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

export const organizationApi = {
  memberships: (organizationId: string) =>
    getList<Membership>(API.organization.memberships(organizationId)),
  agentActivity: (campaignId: string, query?: { page?: number }) =>
    getMethod<AgentActivityPage>(API.campaign.agentActivity(campaignId), query),
};
