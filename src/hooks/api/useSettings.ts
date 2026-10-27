import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsApi, type CampaignFields } from "../../services/settings";
import { authApi, type NotificationPreferences } from "../../services/auth";
import { queryKeys } from "../../lib/queryClient";

export function useOrgCampaigns(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["organization", organizationId, "campaigns"],
    queryFn: () => settingsApi.campaigns(organizationId!),
    enabled: !!organizationId,
  });
}

/** Campaign and role changes alter what the user can open, so reload the context too. */
function useInvalidateAccess(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["organization", organizationId] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.authContext });
  };
}

export function useSaveCampaign(organizationId: string | undefined) {
  const invalidate = useInvalidateAccess(organizationId);
  return useMutation({
    mutationFn: async (
      input:
        | { kind: "update"; campaignId: string; revision: number; fields: CampaignFields }
        | {
            kind: "create";
            fields: CampaignFields;
            slug: string;
            geographyVersionId: string;
            scopeUnitIds: string[];
          },
    ) =>
      input.kind === "update"
        ? (
            await settingsApi.updateCampaign(input.campaignId, {
              ...input.fields,
              expected_revision: input.revision,
            })
          ).data
        : (
            await settingsApi.createCampaign(organizationId!, {
              ...input.fields,
              slug: input.slug,
              geography_version_id: input.geographyVersionId,
              scope_unit_ids: input.scopeUnitIds,
            })
          ).data,
    // A 409 means someone else edited the campaign; reload so the retry starts from it.
    onSettled: invalidate,
  });
}

export function useUpdateMembership(organizationId: string | undefined) {
  const invalidate = useInvalidateAccess(organizationId);
  return useMutation({
    mutationFn: async (input: { membershipId: string; role: string; status: string }) =>
      (
        await settingsApi.updateMembership(organizationId!, input.membershipId, {
          role: input.role,
          status: input.status,
        })
      ).data,
    onSettled: invalidate,
  });
}

export function useGeographicGrants(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign", campaignId, "geographic-grants"],
    queryFn: () => settingsApi.grants(campaignId!),
    enabled: !!campaignId,
  });
}

/**
 * Sets a member's state scope in the campaign: revokes any current grants,
 * then grants the chosen unit (or leaves none for "All / none").
 */
export function useSetGrant(campaignId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      membershipId: string;
      current: string[];
      unitId: string | null;
    }) => {
      for (const grantId of input.current) await settingsApi.revokeGrant(grantId);
      if (input.unitId) {
        await settingsApi.grant(campaignId!, {
          membership_id: input.membershipId,
          geographic_unit_id: input.unitId,
        });
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["campaign", campaignId, "geographic-grants"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.authContext });
    },
  });
}

/** Saves one preference; the server returns the full set, which the context then reloads. */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<NotificationPreferences>) =>
      (await authApi.updateNotificationPreferences(patch)).data,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.authContext }),
  });
}
