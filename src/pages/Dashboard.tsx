import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  FileText,
  Map,
  Radio,
  Send,
  Users,
  Waves,
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { StatCard } from "../components/ui/StatCard";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ErrorState, LoadingRows } from "../components/ui/AsyncState";
import { NigeriaMap } from "../components/charts/NigeriaMap";
import { useFilters } from "../context/FilterContext";
import {
  useActivityFeed,
  useCampaignAlerts,
  useCampaignAnalytics,
  useDashboardOverview,
} from "../hooks/api/useDashboard";
import { useAgentActivity, usePeopleDirectory } from "../hooks/api/usePeople";
import { useUnitNames } from "../hooks/useUnitNames";
import { useNow } from "../hooks/useNow";
import { formatReach } from "../hooks/useScopedData";
import { describeAlert, sortAlerts } from "../lib/alerts";
import { humanize, isoDay, parseApiDate, relativeTime } from "../lib/format";
import { STATE_ACTIVITY, type StateActivity, type Trend } from "../lib/data";
import type { CampaignAnalytics } from "../services/dashboard";
import { cn } from "../lib/cn";

const KPI_ICONS = [Waves, Users, Activity, FileText];

/** Window for the heatmap and daily counts; the API allows up to 366 days. */
const ANALYTICS_DAYS = 30;
/** An agent with a heartbeat this recent counts as online. */
const ONLINE_WINDOW_MS = 15 * 60_000;

const STREAM_DOT = {
  primary: "bg-primary",
  accent: "bg-accent",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
} as const;

type StreamTone = keyof typeof STREAM_DOT;

const EVENT_COPY: Record<string, { action: string; tone: StreamTone }> = {
  field_report: { action: "submitted a field report", tone: "primary" },
  polling_report: { action: "filed a polling-unit report", tone: "accent" },
  "polling_report.verify": { action: "verified a polling report", tone: "info" },
  "polling_report.reject": { action: "rejected a polling report", tone: "warning" },
  "polling_report.revoke": { action: "revoked a polling report review", tone: "warning" },
  incident: { action: "reported an incident", tone: "destructive" },
  "incident.create": { action: "logged an incident", tone: "destructive" },
  "incident.assign": { action: "assigned an incident", tone: "warning" },
  "incident.escalate": { action: "escalated an incident", tone: "destructive" },
  "incident.resolve": { action: "resolved an incident", tone: "info" },
  "incident.reopen": { action: "reopened an incident", tone: "warning" },
  "task.created": { action: "created a task", tone: "primary" },
  "task.started": { action: "started a task", tone: "accent" },
  "task.completed": { action: "completed a task", tone: "info" },
  "task.cancelled": { action: "cancelled a task", tone: "warning" },
  "media.uploaded": { action: "uploaded evidence", tone: "primary" },
};

const REPORT_EVENTS = new Set(["field_report", "polling_report"]);

function describeEvent(eventType: string) {
  return (
    EVENT_COPY[eventType] ?? { action: humanize(eventType).toLowerCase(), tone: "info" as const }
  );
}

/** "Lagos State", "LAGOS", "FCT - Abuja" → one key, to join API states to map shapes. */
function stateKey(name: string): string {
  const s = name.toLowerCase().replace(/\bstate\b/g, "").replace(/[^a-z]/g, "");
  if (s.includes("fct") || s.includes("abuja") || s.includes("federalcapital")) return "fct";
  return s;
}

// `Map` here is the lucide icon, so use the global constructor explicitly.
const SHAPES_BY_KEY = new globalThis.Map(STATE_ACTIVITY.map((s) => [stateKey(s.name), s]));

/** Field + polling reports for one day of the analytics window. */
function reportsOn(analytics: CampaignAnalytics | undefined, day: string): number {
  if (!analytics) return 0;
  const field = analytics.daily_field_reports.find((d) => d.day === day)?.total ?? 0;
  const polling = analytics.daily_polling_reports.find((d) => d.day === day)?.total ?? 0;
  return field + polling;
}

/** Percentage change, or null when there is no baseline to compare against. */
function change(current: number, previous: number): { delta: string; trend: Trend } | null {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  return { delta: `${Math.abs(pct).toFixed(1)}%`, trend: pct >= 0 ? "up" : "down" };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { apiCampaign, scopeUnit, scopeLabel } = useFilters();
  const campaignId = apiCampaign?.id;
  const unitName = useUnitNames();
  const personName = usePeopleDirectory();
  const now = useNow();

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - (ANALYTICS_DAYS - 1));
    const yesterday = new Date();
    yesterday.setDate(to.getDate() - 1);
    return { from: isoDay(from), to: isoDay(to), yesterday: isoDay(yesterday) };
  }, []);

  const overview = useDashboardOverview(campaignId);
  const analytics = useCampaignAnalytics(campaignId, { from: range.from, to: range.to });
  const agents = useAgentActivity(campaignId);
  const alertsQuery = useCampaignAlerts(campaignId);
  const activity = useActivityFeed(campaignId);

  const criticalAlerts = sortAlerts(alertsQuery.data?.items ?? []);
  const activityStream = activity.data?.pages[0]?.items ?? [];

  // API states joined to map shapes by name. A state with no shape (e.g. in
  // a demo geography) is left off rather than drawn in the wrong place.
  const { states, isNationwide } = useMemo(() => {
    const rows = analytics.data?.field_activity_by_state ?? [];
    const joined: StateActivity[] = [];
    for (const r of rows) {
      if (scopeUnit && r.geographic_unit_id !== scopeUnit.id) continue;
      const shape = SHAPES_BY_KEY.get(stateKey(r.name));
      if (shape) {
        joined.push({
          ...shape,
          activity: r.reports,
          reports: r.reports,
          reach: 0,
          agents: 0,
          sentiment: 0,
        });
      }
    }
    return { states: joined, isNationwide: !scopeUnit };
  }, [analytics.data, scopeUnit]);

  const o = overview.data;
  const reportsToday = reportsOn(analytics.data, range.to);
  const reportsTrend = analytics.data
    ? change(reportsToday, reportsOn(analytics.data, range.yesterday))
    : null;

  const onlineAgents = (agents.data?.agents ?? []).filter((a) => {
    const beat = parseApiDate(a.last_heartbeat_at);
    return beat != null && now - beat.getTime() < ONLINE_WINDOW_MS;
  }).length;

  // The first activity page is newest-first; when every item on it falls in
  // the last hour there may be more, hence the trailing "+".
  const hourAgo = now - 3_600_000;
  const recent = activityStream.filter(
    (e) => (parseApiDate(e.occurred_at)?.getTime() ?? 0) >= hourAgo,
  );
  const reportsLastHour = recent.filter((e) => REPORT_EVENTS.has(e.event_type)).length;
  const lastHourMore =
    recent.length > 0 &&
    recent.length === activityStream.length &&
    !!activity.data?.pages[0]?.next_cursor;

  const sentimentDays = analytics.data?.daily_sentiment_observations.length ?? 0;

  const kpis: {
    label: string;
    value: string;
    delta?: string;
    trend?: Trend;
    caption?: string;
    tone: "primary" | "accent" | "info" | "warning";
  }[] = [
    {
      label: "Total Reach",
      value: o ? formatReach(o.reports.declared_people_reached) : "—",
      caption: "Declared by field agents",
      tone: "primary",
    },
    {
      label: "Active Agents",
      value: o ? o.agents.assigned_active.toLocaleString() : "—",
      caption: agents.data ? `${onlineAgents} online now` : undefined,
      tone: "accent",
    },
    {
      // No score until reviewed sentiment observations are recorded; the
      // calculation is wired with the Intelligence screen.
      label: "Sentiment Score",
      value: "—",
      caption: analytics.data
        ? sentimentDays
          ? `${sentimentDays} days with observations · ${ANALYTICS_DAYS}d window`
          : "No recorded observations yet"
        : undefined,
      tone: "info",
    },
    {
      label: "Reports Today",
      value: analytics.data ? reportsToday.toLocaleString() : "—",
      delta: reportsTrend?.delta,
      trend: reportsTrend?.trend,
      caption: activity.data
        ? `+${reportsLastHour}${lastHourMore ? "+" : ""} in last hour`
        : undefined,
      tone: "warning",
    },
  ];

  return (
    <>
      <PageHeader
        title="National Command Dashboard"
        subtitle={`Real-time visibility across ${scopeLabel}`}
        actions={
          <>
            <Button variant="outline" size="md">
              <ClipboardList className="h-4 w-4" />
              Submit Report
            </Button>
            <Button variant="primary" size="md" onClick={() => navigate("/command")}>
              <Radio className="h-4 w-4" />
              Open Command Center
            </Button>
          </>
        }
      />

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => {
          const Icon = KPI_ICONS[i];
          return (
            <StatCard
              key={k.label}
              label={k.label}
              value={k.value}
              delta={k.delta}
              trend={k.trend ?? "up"}
              caption={k.caption}
              tone={k.tone}
              icon={<Icon className="h-4 w-4" />}
            />
          );
        })}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          title="Geo-Intelligence Heatmap"
          subtitle={
            isNationwide
              ? "Click a state to drill into LGA → Ward"
              : `Scoped to ${scopeLabel}`
          }
          icon={<Map className="h-4 w-4" />}
        >
          {analytics.isError ? (
            <ErrorState error={analytics.error} onRetry={() => analytics.refetch()} />
          ) : (
            <NigeriaMap
              states={states}
              contextStates={STATE_ACTIVITY}
              onSelect={() => navigate("/intelligence")}
            />
          )}
        </Panel>

        <Panel
          title="Critical Alerts"
          subtitle="Auto-flagged by Sentinel AI"
          icon={<AlertTriangle className="h-4 w-4" />}
          action={
            <Badge tone="destructive" dot>
              {criticalAlerts.length} live
            </Badge>
          }
          bodyClassName="p-0"
        >
          {alertsQuery.isLoading ? (
            <LoadingRows rows={3} />
          ) : alertsQuery.isError ? (
            <ErrorState error={alertsQuery.error} onRetry={() => alertsQuery.refetch()} />
          ) : (
            <ul className="divide-y divide-border">
              {criticalAlerts.map((a) => {
                const d = describeAlert(a, unitName(a.geographic_unit_id));
                return (
                  <li
                    key={`${a.type}:${a.target_id}`}
                    className="cursor-pointer px-4 py-3 transition-colors hover:bg-secondary/40 sm:px-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[13px] font-medium leading-snug">{d.title}</p>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {relativeTime(a.occurred_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {d.detail}
                    </p>
                    <Badge tone={d.severity.tone} className="mt-2">
                      {d.severity.label}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          title="Activity Stream"
          subtitle="Live across the platform"
          icon={<Activity className="h-4 w-4" />}
          action={
            <Badge tone="success" dot>
              Live
            </Badge>
          }
          bodyClassName="p-0"
        >
          {activity.isLoading ? (
            <LoadingRows rows={5} />
          ) : activity.isError ? (
            <ErrorState error={activity.error} onRetry={() => activity.refetch()} />
          ) : (
            <ol className="divide-y divide-border">
              {activityStream.map((s) => {
                const d = describeEvent(s.event_type);
                const place = unitName(s.geographic_unit_id);
                return (
                  <li key={s.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                    <span className="relative mt-1.5 flex h-2 w-2 shrink-0">
                      <span
                        className={cn(
                          "absolute inline-flex h-full w-full rounded-full opacity-60",
                          STREAM_DOT[d.tone],
                        )}
                      />
                      <span
                        className={cn(
                          "relative inline-flex h-2 w-2 rounded-full",
                          STREAM_DOT[d.tone],
                        )}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-snug">
                        <span className="font-semibold">{personName(s.actor_membership_id)}</span>{" "}
                        <span className="text-muted-foreground">{d.action}</span>
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        {[relativeTime(s.occurred_at), place].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>

        <Panel title="Quick Actions" subtitle="Jump straight into a workflow">
          <div className="grid gap-2.5">
            {[
              {
                label: "Open Command Center",
                detail: "Polling units & incidents",
                icon: Radio,
                to: "/command",
                tone: "destructive" as const,
              },
              {
                label: "Send Campaign Message",
                detail: "Multi-channel distribution",
                icon: Send,
                to: "/communications",
                tone: "accent" as const,
              },
              {
                label: "Assign Field Task",
                detail: "Dispatch to agents",
                icon: ClipboardList,
                to: "/operations",
                tone: "warning" as const,
              },
              {
                label: "View Intelligence Pulse",
                detail: "Sentiment & influence",
                icon: Activity,
                to: "/intelligence",
                tone: "primary" as const,
              },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => navigate(a.to)}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-secondary/60"
              >
                <span
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                    a.tone === "destructive" && "bg-destructive/12 text-destructive",
                    a.tone === "accent" && "bg-accent/12 text-accent",
                    a.tone === "warning" && "bg-warning/12 text-warning",
                    a.tone === "primary" && "bg-primary/12 text-primary",
                  )}
                >
                  <a.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold">{a.label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {a.detail}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
