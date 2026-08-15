import { useMemo } from "react";
import { useFilters } from "../context/FilterContext";
import { useRoster } from "../context/RosterContext";
import {
  ACTIVITY_STREAM,
  AGENTS,
  CRITICAL_ALERTS,
  FIELD_REPORTS,
  INCIDENTS,
  INFLUENCERS,
  KEY_ISSUES,
  LIVE_CAMPAIGNS,
  POLLING_UNITS,
  PRIORITY_ALERTS,
  STATE_ACTIVITY,
  VOTER_SEGMENTS,
} from "../lib/data";

/** Compact large counts the way the KPI tiles present them. */
export function formatReach(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

/**
 * Stable small offset in [-spread, spread] derived from a string.
 *
 * Demo-only: the dataset has no real per-state breakdown for issue salience or
 * segment mix, so these are varied deterministically by scope rather than left
 * frozen. Same scope always yields the same numbers.
 */
function jitter(seed: string, spread: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return ((Math.abs(h) % (spread * 2 + 1)) - spread);
}

export function useScopedData() {
  const { activeStates, scope, isNationwide, campaign } = useFilters();
  const { created } = useRoster();

  return useMemo(() => {
    /** Records tagged `null` are platform-wide and survive every filter. */
    const inScope = (s: string | null | undefined) =>
      s == null || s === "All" || activeStates.has(s);

    /** Campaign ownership — used by records that belong to one campaign. */
    const inCampaign = (id: string | null | undefined) => id == null || id === campaign.id;

    const states = STATE_ACTIVITY.filter((s) => activeStates.has(s.name));
    const seed = `${campaign.id}:${scope}`;

    // Headline figures are sums over the states in scope.
    const reach = states.reduce((t, s) => t + s.reach, 0);
    const agentCount = states.reduce((t, s) => t + s.agents, 0);
    const reports = states.reduce((t, s) => t + s.reports, 0);
    const sentimentScore = states.length
      ? Math.round(states.reduce((t, s) => t + s.sentiment, 0) / states.length)
      : 0;

    // Split the net score into a positive / neutral / negative mix.
    const positive = Math.round(sentimentScore * 0.965);
    const negative = Math.round((100 - sentimentScore) * 0.375);

    const keyIssues = KEY_ISSUES.map((i) => ({
      ...i,
      score: Math.max(5, Math.min(100, i.score + jitter(seed + i.label, 10))),
    })).sort((a, b) => b.score - a.score);

    const rawSegments = VOTER_SEGMENTS.map((s) => ({
      ...s,
      share: Math.max(4, s.share + jitter(seed + s.label, 6)),
    }));
    const segmentTotal = rawSegments.reduce((t, s) => t + s.share, 0);
    const voterSegments = rawSegments.map((s) => ({
      ...s,
      share: Math.round((s.share / segmentTotal) * 100),
    }));

    return {
      inScope,
      inCampaign,
      campaign,
      states,
      /** Agents-per-state roll-up used by the hierarchy tree. */
      hierarchy: [...states]
        .sort((a, b) => b.agents - a.agents)
        .map((s) => ({ state: s.name, agents: s.agents, lgas: s.lgas })),

      totals: {
        reach,
        agents: agentCount,
        reports,
        sentiment: sentimentScore,
        onlineAgents: Math.max(1, Math.round(agentCount * 0.0022)),
        reportsLastHour: Math.max(1, Math.round(reports * 0.0098)),
      },

      sentiment: {
        net: sentimentScore,
        positive,
        negative,
        neutral: Math.max(0, 100 - positive - negative),
      },

      keyIssues,
      voterSegments,

      criticalAlerts: CRITICAL_ALERTS.filter((a) => inScope(a.state)),
      activityStream: ACTIVITY_STREAM.filter((a) => inScope(a.state)),
      fieldReports: FIELD_REPORTS.filter((r) => inScope(r.state)),
      pollingUnits: POLLING_UNITS.filter((u) => inScope(u.state)),
      incidents: INCIDENTS.filter((i) => inScope(i.state)),
      priorityAlerts: PRIORITY_ALERTS.filter((a) => inScope(a.state)),
      // Session-provisioned agents sit above the seed roster.
      agents: [...created, ...AGENTS].filter((a) => inScope(a.state)),
      influencers: INFLUENCERS.filter((p) => inScope(p.state)),
      liveCampaigns: LIVE_CAMPAIGNS.filter((c) => inScope(c.state)),

      isNationwide,
      scopeLabel: isNationwide ? campaign.scopeLabel : scope,
    };
  }, [activeStates, scope, isNationwide, campaign, created]);
}
