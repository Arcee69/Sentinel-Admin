/**
 * Back-office endpoint paths, relative to VITE_API_BASE_URL (`…/api/v1`).
 * Path IDs are always UUIDs returned by the API, never display labels.
 * Grouped as in frontend-integration-guide.md; groups are added as each
 * screen is integrated.
 */
export const API = {
  health: "/health",

  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    logoutAll: "/auth/logout-all",
    context: "/auth/context",
    me: "/auth/me",
    notificationPreferences: "/auth/notification-preferences",
    password: "/auth/password",
  },

  campaign: {
    show: (c: string) => `/campaigns/${c}`,
    dashboardOverview: (c: string) => `/campaigns/${c}/dashboard/overview`,
    alerts: (c: string) => `/campaigns/${c}/alerts`,
    activity: (c: string) => `/campaigns/${c}/activity`,
    analytics: (c: string) => `/campaigns/${c}/analytics`,
    geographicOverview: (c: string, unit: string) => `/campaigns/${c}/geographic-overview/${unit}`,
    notifications: (c: string) => `/campaigns/${c}/notifications`,
    agentActivity: (c: string) => `/campaigns/${c}/agents/activity`,
  },

  organization: {
    memberships: (o: string) => `/organizations/${o}/memberships`,
    agents: (o: string) => `/organizations/${o}/agents`,
  },

  geography: {
    units: (version: string) => `/geography-versions/${version}/units`,
  },

  catalog: {
    pollingOccasions: "/polling-occasions",
  },
} as const;
