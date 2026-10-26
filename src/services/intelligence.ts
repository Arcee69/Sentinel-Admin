import { API } from "./api";
import { getAllPages, getMethod } from "./requests";

export type SentimentCode = "positive" | "neutral" | "negative" | "mixed" | (string & {});

/** A label with how often it was observed; sample sizes may overlap. */
export interface ObservedLabel {
  label: string;
  observation_count: number;
  /** The API sends this as a numeric string in these lists. */
  declared_sample_size: number | string;
}

export interface IntelligenceSummary {
  campaign_id: string;
  source_label: string;
  methodology_notice: string;
  breakdown: {
    channel: string;
    sentiment: SentimentCode;
    observation_count: number;
    declared_sample_size: number | string;
  }[];
  audience_segments: ObservedLabel[];
  key_issues: ObservedLabel[];
  influencers: ObservedLabel[];
  trend: { day: string; sentiment: SentimentCode; observation_count: number }[];
}

export interface IntelligenceObservation {
  id: string;
  organization_id: string;
  campaign_id: string;
  reference_source_id: string;
  geographic_unit_id: string | null;
  created_by_membership_id: string;
  observed_on: string;
  channel: string;
  sentiment: SentimentCode;
  audience_segment: string | null;
  issue: string | null;
  influencer: string | null;
  sample_size: number;
  methodology: string;
  created_at: string;
  updated_at: string;
}

export const intelligenceApi = {
  /** `from`/`to` are `YYYY-MM-DD`; `geographic_unit_id` narrows to a subtree. */
  summary: (
    campaignId: string,
    query: { from: string; to: string; geographic_unit_id?: string },
  ) => getMethod<IntelligenceSummary>(API.campaign.intelligenceSummary(campaignId), query),
  observations: (campaignId: string) =>
    getAllPages<IntelligenceObservation>(API.campaign.intelligenceObservations(campaignId)),
};
