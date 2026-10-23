import type { BadgeTone } from "../components/ui/Badge";
import type { AlertSeverity, CampaignAlert } from "../services/dashboard";
import { humanize } from "./format";

export const SEVERITY: Record<AlertSeverity, { tone: BadgeTone; label: string; dot: string }> = {
  critical: { tone: "destructive", label: "Critical", dot: "bg-destructive" },
  high: { tone: "warning", label: "High", dot: "bg-warning" },
  medium: { tone: "info", label: "Medium", dot: "bg-info" },
  low: { tone: "accent", label: "Low", dot: "bg-accent" },
};

const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const ALERT_COPY: Record<string, { title: string; detail: string; to: string }> = {
  overdue_task: {
    title: "Task overdue",
    detail: "A field task passed its due date without completion.",
    to: "/operations",
  },
  critical_incident: {
    title: "High-severity incident unresolved",
    detail: "An escalated incident is waiting for triage.",
    to: "/command",
  },
  idle_agent: {
    title: "Agent idle",
    detail: "An assigned agent hasn't checked in or reported recently.",
    to: "/agents",
  },
};

export function describeAlert(alert: CampaignAlert, place?: string) {
  const copy = ALERT_COPY[alert.type] ?? {
    title: humanize(alert.type),
    detail: `Linked ${humanize(alert.target_type).toLowerCase()} needs attention.`,
    to: "/command",
  };
  return {
    ...copy,
    detail: place ? `${copy.detail} · ${place}` : copy.detail,
    severity: SEVERITY[alert.severity] ?? SEVERITY.medium,
  };
}

/** Most severe first, then newest. */
export function sortAlerts(alerts: CampaignAlert[]): CampaignAlert[] {
  return [...alerts].sort(
    (a, b) =>
      (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9) ||
      b.occurred_at.localeCompare(a.occurred_at),
  );
}
