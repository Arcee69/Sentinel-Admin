import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { operationsApi, type CreateTaskPayload } from "../../services/operations";
import { useAgentActivity } from "./usePeople";

export const opsKeys = {
  tasks: (c?: string) => ["campaign", c, "tasks"] as const,
  fieldReports: (c?: string) => ["campaign", c, "field-reports"] as const,
  assignments: (c?: string) => ["campaign", c, "assignments"] as const,
  media: (c?: string) => ["campaign", c, "media"] as const,
};

/** Evidence files across the campaign; callers pick out a report's own. */
export function useCampaignMedia(campaignId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: opsKeys.media(campaignId),
    queryFn: () => operationsApi.media(campaignId!),
    enabled: !!campaignId && enabled,
    staleTime: 30_000,
  });
}

export function useTasksQuery(campaignId: string | undefined) {
  return useQuery({
    queryKey: opsKeys.tasks(campaignId),
    queryFn: () => operationsApi.tasks(campaignId!),
    enabled: !!campaignId,
  });
}

export function useFieldReports(campaignId: string | undefined) {
  return useQuery({
    queryKey: opsKeys.fieldReports(campaignId),
    queryFn: () => operationsApi.fieldReports(campaignId!),
    enabled: !!campaignId,
    refetchInterval: 60_000,
  });
}

export function useAssignments(campaignId: string | undefined) {
  return useQuery({
    queryKey: opsKeys.assignments(campaignId),
    queryFn: () => operationsApi.assignments(campaignId!),
    enabled: !!campaignId,
  });
}

/** Task counts feed the dashboard, alerts and activity, so refresh those too. */
function invalidateTaskViews(queryClient: ReturnType<typeof useQueryClient>, campaignId: string) {
  for (const key of ["tasks", "overview", "alerts", "activity", "agents-activity", "agent"]) {
    void queryClient.invalidateQueries({ queryKey: ["campaign", campaignId, key] });
  }
}

export function useCreateTask(campaignId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTaskPayload) =>
      (await operationsApi.createTask(campaignId!, payload)).data,
    onSuccess: () => invalidateTaskViews(queryClient, campaignId!),
  });
}

export function useCancelTask(campaignId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, revision }: { taskId: string; revision: number }) =>
      (await operationsApi.cancelTask(taskId, revision)).data,
    // A 409 means someone changed the task first; refetching shows its new state.
    onSettled: () => invalidateTaskViews(queryClient, campaignId!),
  });
}

export interface AssignableAgent {
  assignmentId: string;
  membershipId: string;
  name: string;
  duty: string;
  geographicUnitId: string;
}

/**
 * Agents a task can go to: active assignments in the campaign, named from the
 * agent roster (assignments themselves carry no names).
 */
export function useAssignableAgents(campaignId: string | undefined) {
  const assignments = useAssignments(campaignId);
  const roster = useAgentActivity(campaignId);

  const agents = useMemo<AssignableAgent[]>(() => {
    const names = new Map((roster.data?.agents ?? []).map((a) => [a.membership_id, a.name]));
    return (assignments.data ?? [])
      .filter((a) => a.ends_at == null)
      .map((a) => ({
        assignmentId: a.id,
        membershipId: a.agent_membership_id,
        name: names.get(a.agent_membership_id) ?? "Unnamed agent",
        duty: a.duty,
        geographicUnitId: a.geographic_unit_id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments.data, roster.data]);

  return {
    agents,
    isLoading: assignments.isLoading || roster.isLoading,
    error: assignments.error ?? roster.error,
  };
}
