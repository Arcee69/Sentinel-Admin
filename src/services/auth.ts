import { API } from "./api";
import { getMethod, patchMethod, postMethod, putMethod } from "./requests";

export type CampaignRole = "admin" | "manager" | "observer" | "agent" | (string & {});

export interface NotificationPreferences {
  incidents: boolean;
  assignments: boolean;
  campaign_messages: boolean;
  sentiment_dip_warnings: boolean;
  agent_idle_alerts: boolean;
  daily_executive_summary: boolean;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  last_login_at: string | null;
  notification_preferences: NotificationPreferences;
  email_verified_at: string | null;
  created_at: string;
}

export interface CampaignAccess {
  role: CampaignRole;
  /** Command actions (tasks, broadcasts, triage, settings). */
  can_manage: boolean;
  /** Field work (agent submissions). */
  can_work: boolean;
}

export interface ContextCampaign {
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
  revision: number;
  scope_unit_ids: string[];
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
  access: CampaignAccess;
}

export interface ContextStats {
  tasks_total: number;
  tasks_completed: number;
  field_reports: number;
  polling_reports: number;
  incidents: number;
}

export interface ContextOrganization {
  organization: { id: string; name: string };
  membership: { id: string; role: CampaignRole };
  campaigns: ContextCampaign[];
  assignments: unknown[];
  agent_profile: unknown | null;
  home_unit: unknown | null;
  stats: ContextStats;
}

export interface AuthContextData {
  user: ApiUser;
  organizations: ContextOrganization[];
}

export interface LoginResult {
  user: ApiUser;
  token: string;
  token_type: string;
  expires_at: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
  device_name: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export const authApi = {
  login: (payload: LoginPayload) => postMethod<LoginResult>(API.auth.login, payload),
  /** Pass the token explicitly when the local session is cleared at the same time. */
  logout: (token?: string) =>
    postMethod<null>(
      API.auth.logout,
      undefined,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    ),
  logoutAll: () => postMethod<null>(API.auth.logoutAll),
  context: () => getMethod<AuthContextData>(API.auth.context),
  me: () => getMethod<ApiUser>(API.auth.me),
  updateMe: (payload: { phone: string | null }) => patchMethod<ApiUser>(API.auth.me, payload),
  updateNotificationPreferences: (payload: Partial<NotificationPreferences>) =>
    patchMethod<NotificationPreferences>(API.auth.notificationPreferences, payload),
  changePassword: (payload: ChangePasswordPayload) => putMethod<null>(API.auth.password, payload),
};
