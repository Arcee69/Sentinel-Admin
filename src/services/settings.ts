import { API } from "./api";
import { getAllPages, patchMethod, postMethod } from "./requests";
import type { Membership } from "./organization";

/** A campaign as the organization campaigns list returns it. */
export interface Campaign {
  id: string;
  organization_id: string;
  geography_version_id: string;
  name: string;
  slug: string;
  status: string;
  party: string | null;
  candidate: string | null;
  office: string | null;
  cycle: string | null;
  /** Send back as `expected_revision` on every update. */
  revision: number;
  scope_unit_ids: string[];
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
}

export interface CampaignFields {
  name: string;
  party: string;
  candidate?: string;
  office?: string;
  cycle: string;
  status: string;
  starts_on?: string | null;
  ends_on?: string | null;
}

/** An observer coordinator's geographic reach within one campaign. */
export interface GeographicGrant {
  id: string;
  campaign_id: string;
  membership_id: string;
  geographic_unit_id: string;
  revoked_at?: string | null;
  [key: string]: unknown;
}

export const settingsApi = {
  campaigns: (organizationId: string) =>
    getAllPages<Campaign>(API.organization.campaigns(organizationId)),
  createCampaign: (
    organizationId: string,
    payload: CampaignFields & { slug: string; geography_version_id: string; scope_unit_ids: string[] },
  ) => postMethod<Campaign>(API.organization.campaigns(organizationId), payload),
  /** Scope isn't editable here; it's fixed when the campaign is created. */
  updateCampaign: (campaignId: string, payload: CampaignFields & { expected_revision: number }) =>
    patchMethod<Campaign>(API.campaign.show(campaignId), payload),

  updateMembership: (
    organizationId: string,
    membershipId: string,
    payload: { role: string; status: string },
  ) => patchMethod<Membership>(API.organization.membership(organizationId, membershipId), payload),

  grants: (campaignId: string) => getAllPages<GeographicGrant>(API.campaign.geographicGrants(campaignId)),
  grant: (campaignId: string, payload: { membership_id: string; geographic_unit_id: string }) =>
    postMethod<GeographicGrant>(API.campaign.geographicGrants(campaignId), payload),
  revokeGrant: (grantId: string) => postMethod<GeographicGrant>(API.geographicGrant.revoke(grantId)),
};
