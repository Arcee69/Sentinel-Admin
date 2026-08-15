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
import { NigeriaMap } from "../components/charts/NigeriaMap";
import { useScopedData, formatReach } from "../hooks/useScopedData";
import { STATE_ACTIVITY } from "../lib/data";
import { cn } from "../lib/cn";

const KPI_ICONS = [Waves, Users, Activity, FileText];

const SEVERITY: Record<string, { tone: "destructive" | "warning" | "info" | "accent"; label: string }> = {
  critical: { tone: "destructive", label: "Critical" },
  high: { tone: "warning", label: "High" },
  medium: { tone: "info", label: "Medium" },
  low: { tone: "accent", label: "Low" },
};

const STREAM_DOT = {
  primary: "bg-primary",
  accent: "bg-accent",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
} as const;

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    states,
    totals,
    criticalAlerts,
    activityStream,
    scopeLabel,
    isNationwide,
  } = useScopedData();

  // KPI tiles are sums over the states currently in scope.
  const kpis = [
    {
      label: "Total Reach",
      value: formatReach(totals.reach),
      delta: "6.4%",
      caption: "Across all channels",
      tone: "primary" as const,
    },
    {
      label: "Active Agents",
      value: totals.agents.toLocaleString(),
      delta: "2.1%",
      caption: `${totals.onlineAgents} online now`,
      tone: "accent" as const,
    },
    {
      label: "Sentiment Score",
      value: String(totals.sentiment),
      delta: "1.2%",
      caption: "Net positive · 14d window",
      tone: "info" as const,
    },
    {
      label: "Reports Today",
      value: totals.reports.toLocaleString(),
      delta: "12.8%",
      caption: `+${totals.reportsLastHour} in last hour`,
      tone: "warning" as const,
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
              trend="up"
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
          <NigeriaMap
            states={states}
            contextStates={STATE_ACTIVITY}
            onSelect={() => navigate("/intelligence")}
          />
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
          <ul className="divide-y divide-border">
            {criticalAlerts.map((a) => {
              const sev = SEVERITY[a.severity];
              return (
                <li
                  key={a.id}
                  className="cursor-pointer px-4 py-3 transition-colors hover:bg-secondary/40 sm:px-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13px] font-medium leading-snug">{a.title}</p>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {a.time}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {a.detail}
                  </p>
                  <Badge tone={sev.tone} className="mt-2">
                    {sev.label}
                  </Badge>
                </li>
              );
            })}
          </ul>
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
          <ol className="divide-y divide-border">
            {activityStream.map((s) => (
              <li key={s.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                <span className="relative mt-1.5 flex h-2 w-2 shrink-0">
                  <span
                    className={cn(
                      "absolute inline-flex h-full w-full rounded-full opacity-60",
                      STREAM_DOT[s.tone],
                    )}
                  />
                  <span
                    className={cn(
                      "relative inline-flex h-2 w-2 rounded-full",
                      STREAM_DOT[s.tone],
                    )}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug">
                    <span className="font-semibold">{s.actor}</span>{" "}
                    <span className="text-muted-foreground">{s.action}</span>
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {s.meta}
                  </p>
                </div>
              </li>
            ))}
          </ol>
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
