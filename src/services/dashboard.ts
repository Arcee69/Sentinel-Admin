import { API } from "./api";
import { getList, getMethod, type Query } from "./requests";

/** Every operational summary carries its provenance and server time. */
interface Provenance {
  campaign_id: string;
  as_of: string;
  source_label?: string;
}

export type ParticipationMode = "provisional" | "verified";

export interface ParticipationMetric {
  count: number;
  registered_denominator: number;
  reporting_places: number;
  excluded_conflicts: number;
  rate_percent: number | null;
  coverage_percent: number | null;
}

export interface ParticipationSummary extends Provenance {
  organization_id: string;
  polling_occasion_id: string;
  register_version_id: string;
  geographic_unit_id: string | null;
  mode: ParticipationMode;
  eligible_polling_places: number;
  /** Registered voters under the unit across the whole register. */
  registered_total: number | null;
  accredited_persons: ParticipationMetric;
  participating_persons: ParticipationMetric;
}

export interface DashboardOverview extends Provenance {
  organization_id: string;
  notifications: { unread: number };
  agents: { assigned_active: number };
  tasks: {
    total: number;
    open: number;
    in_progress: number;
    completed: number;
    cancelled: number;
    overdue: number;
  };
  reports: {
    field_total: number;
    declared_people_reached: number;
    polling_total: number;
    polling_pending_review: number;
  };
  incidents: {
    total: number;
    open: number;
    escalated: number;
    resolved: number;
    unresolved_high_or_critical: number;
  };
  /** Present only when a polling occasion is requested. */
  participation: ParticipationSummary | null;
}

export type AlertSeverity = "critical" | "high" | "medium" | "low";

export interface CampaignAlert {
  type: string;
  severity: AlertSeverity;
  target_type: string;
  target_id: string;
  geographic_unit_id: string | null;
  occurred_at: string;
}

export interface ActivityEvent {
  id: string;
  event_type: string;
  target_id: string;
  actor_membership_id: string | null;
  geographic_unit_id: string | null;
  occurred_at: string;
}

export interface ActivityPage extends Provenance {
  items: ActivityEvent[];
  next_cursor: string | null;
}

export interface StateFieldActivity {
  geographic_unit_id: string;
  name: string;
  official_code: string;
  reports: number;
}

export interface CampaignAnalytics extends Provenance {
  from: string;
  to: string;
  engagement: {
    declared_people_reached: number;
    /** Always null: no social provider is connected. */
    provider_engagements: number | null;
    provider_shares: number | null;
    methodology_notice: string;
  };
  field_activity_by_state: StateFieldActivity[];
  daily_field_reports: { day: string; total: number; declared_people_reached: string }[];
  daily_polling_reports: { day: string; total: number }[];
  daily_sentiment_observations: unknown[];
}

export interface GeographicOverview extends Provenance {
  geographic_unit_id: string;
  tasks: number;
  field_reports: number;
  polling_reports: number;
  incidents: number;
}

export interface PollingOccasion {
  id: string;
  election_cycle_id: string;
  geography_version_id: string;
  register_version_id: string;
  reference_source_id: string;
  name: string;
  scheduled_on: string;
  status: string;
  published_at: string | null;
}

export const dashboardApi = {
  overview: (campaignId: string, query?: { polling_occasion_id?: string; mode?: ParticipationMode }) =>
    getMethod<DashboardOverview>(API.campaign.dashboardOverview(campaignId), query),
  alerts: (campaignId: string) =>
    getMethod<Provenance & { items: CampaignAlert[] }>(API.campaign.alerts(campaignId)),
  activity: (campaignId: string, query?: { limit?: number; cursor?: string | null }) =>
    getMethod<ActivityPage>(API.campaign.activity(campaignId), query as Query),
  /** `from`/`to` are `YYYY-MM-DD`, at most 366 days apart. */
  analytics: (campaignId: string, query: { from: string; to: string }) =>
    getMethod<CampaignAnalytics>(API.campaign.analytics(campaignId), query),
  geographicOverview: (campaignId: string, unitId: string) =>
    getMethod<GeographicOverview>(API.campaign.geographicOverview(campaignId, unitId)),
  pollingOccasions: (query?: Query) => getList<PollingOccasion>(API.catalog.pollingOccasions, query),
};
