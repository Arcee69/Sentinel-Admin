import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { organizationApi } from "../../services/organization";
import { humanize } from "../../lib/format";

export function useAgentActivity(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign", campaignId, "agents-activity"],
    queryFn: async () => (await organizationApi.agentActivity(campaignId!)).data,
    enabled: !!campaignId,
  });
}

export function useMemberships(organizationId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["organization", organizationId, "memberships"],
    queryFn: async () => (await organizationApi.memberships(organizationId!)).data,
    enabled: !!organizationId && enabled,
    staleTime: 5 * 60_000,
  });
}

/**
 * Resolves a membership ID to a display name. Memberships carry no names,
 * so names come from the agent roster and the signed-in user; anyone else
 * is shown by role ("Manager").
 */
export function usePeopleDirectory() {
  const { activeCampaign, activeOrganization, apiUser, access } = useAuth();
  const agents = useAgentActivity(activeCampaign?.id);
  const memberships = useMemberships(activeOrganization?.organization.id, !!access?.can_manage);

  return useMemo(() => {
    const names = new Map<string, string>();
    for (const m of memberships.data ?? []) names.set(m.id, humanize(m.role));
    for (const a of agents.data?.agents ?? []) names.set(a.membership_id, a.name);
    if (activeOrganization && apiUser) names.set(activeOrganization.membership.id, "You");

    return (membershipId: string | null | undefined) =>
      (membershipId && names.get(membershipId)) || "A team member";
  }, [memberships.data, agents.data, activeOrganization, apiUser]);
}
