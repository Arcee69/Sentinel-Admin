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
    tasks: (c: string) => `/campaigns/${c}/tasks`,
    fieldReports: (c: string) => `/campaigns/${c}/field-reports`,
    assignments: (c: string) => `/campaigns/${c}/assignments`,
    broadcasts: (c: string) => `/campaigns/${c}/broadcasts`,
    commandPollingUnits: (c: string) => `/campaigns/${c}/command/polling-units`,
    incidents: (c: string) => `/campaigns/${c}/incidents`,
    pollingReports: (c: string) => `/campaigns/${c}/polling-reports`,
    intelligenceSummary: (c: string) => `/campaigns/${c}/intelligence/summary`,
    intelligenceObservations: (c: string) => `/campaigns/${c}/intelligence/observations`,
    participationSummary: (c: string) => `/campaigns/${c}/participation/summary`,
    participationGeography: (c: string) => `/campaigns/${c}/participation/geography`,
    participationHistory: (c: string) => `/campaigns/${c}/participation/history`,
    ballotsSummary: (c: string) => `/campaigns/${c}/ballots/summary`,
    reportSelections: (c: string) => `/campaigns/${c}/report-selections`,
    qualityCases: (c: string) => `/campaigns/${c}/quality-cases`,
    registerDiscrepancies: (c: string) => `/campaigns/${c}/register-discrepancies`,
  },

  incident: {
    show: (i: string) => `/incidents/${i}`,
    events: (i: string) => `/incidents/${i}/events`,
    transitions: (i: string) => `/incidents/${i}/transitions`,
  },

  broadcast: {
    show: (b: string) => `/broadcasts/${b}`,
    publish: (b: string) => `/broadcasts/${b}/publish`,
  },

  task: {
    show: (t: string) => `/tasks/${t}`,
    cancel: (t: string) => `/tasks/${t}/cancel`,
    events: (t: string) => `/tasks/${t}/events`,
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
    electionCycles: "/election-cycles",
    milestones: (cycle: string) => `/election-cycles/${cycle}/milestones`,
    contests: "/contests",
    candidates: (contest: string) => `/contests/${contest}/candidates`,
    parties: "/election-parties",
    electoralDistricts: "/electoral-districts",
    referenceSources: "/reference-sources",
    referenceSourceDownload: (source: string) => `/reference-sources/${source}/download`,
    contestRounds: "/contest-rounds",
    historicalBenchmark: (contest: string) => `/contests/${contest}/historical-benchmark`,
    registerVersions: "/register-versions",
    registerEntries: (version: string) => `/register-versions/${version}/entries`,
  },
} as const;
