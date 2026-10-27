import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { organizationApi, type StaffInvitationPayload } from "../../services/organization";
import { useAgentActivity } from "./usePeople";
import { useUnitLineage } from "../useUnitNames";
import { useNow } from "../useNow";
import { dutyLabel, initialsOf, presenceOf } from "../../lib/agents";
import type { AgentStatus } from "../../lib/data";

export interface RosterAgent {
  /** Membership ID — the agent's identity in routes and task assignment. */
  id: string;
  assignmentId: string;
  name: string;
  initials: string;
  role: string;
  state: string;
  stateId: string | null;
  lga: string;
  reports: number;
  /** Share of assigned tasks completed, 0–100. */
  taskPct: number;
  status: AgentStatus;
  lastHeartbeatAt: string | null;
}

/**
 * Agents on active assignments in the campaign, with names from the
 * activity feed and places from the geography hierarchy.
 */
export function useCampaignRoster(campaignId: string | undefined) {
  const activity = useAgentActivity(campaignId);
  const now = useNow();
  const agents = activity.data?.agents;
  const lineage = useUnitLineage(useMemo(() => (agents ?? []).map((a) => a.geographic_unit_id), [agents]));

  const roster = useMemo<RosterAgent[]>(
    () =>
      (agents ?? []).map((a) => {
        const place = lineage(a.geographic_unit_id);
        return {
          id: a.membership_id,
          assignmentId: a.assignment_id,
          name: a.name,
          initials: initialsOf(a.name),
          role: dutyLabel(a.duty),
          state: place?.state?.name ?? "",
          stateId: place?.state?.id ?? null,
          lga: place?.lga?.name ?? "",
          reports: a.reports.field + a.reports.polling,
          taskPct: a.tasks.total ? Math.round((a.tasks.completed / a.tasks.total) * 100) : 0,
          status: presenceOf(a.last_heartbeat_at, now),
          lastHeartbeatAt: a.last_heartbeat_at,
        };
      }),
    [agents, lineage, now],
  );

  return {
    roster,
    isLoading: activity.isLoading,
    error: activity.error,
    refetch: activity.refetch,
  };
}

/** A created invitation; `token` is shown once and can't be fetched again. */
export interface AgentInvitation {
  id: string;
  organization_id: string;
  email: string;
  name: string;
  role: string;
  campaign_id: string | null;
  token: string;
  expires_at: string;
}

export function useInviteAgent(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: StaffInvitationPayload) =>
      (await organizationApi.invite(organizationId!, payload)).data as unknown as AgentInvitation,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["organization", organizationId] }),
  });
}

export function useAgentDetail(campaignId: string | undefined, membershipId: string | undefined) {
  return useQuery({
    queryKey: ["campaign", campaignId, "agent", membershipId],
    queryFn: async () => (await organizationApi.agent(campaignId!, membershipId!)).data,
    enabled: !!campaignId && !!membershipId,
  });
}
