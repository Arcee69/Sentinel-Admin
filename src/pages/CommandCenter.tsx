import { useState } from "react";
import { toast } from "sonner";
import { AlertOctagon, Megaphone, MapPinned, Radio, ShieldAlert } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Badge, type BadgeTone } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Meter } from "../components/ui/Meter";
import {
  INCIDENTS,
  type Incident,
  type IncidentSeverity,
  type IncidentStatus,
  type PuStatus,
} from "../lib/data";
import { useScopedData } from "../hooks/useScopedData";
import { cn } from "../lib/cn";

/**
 * Status palette — reserved, never reused as a categorical series colour,
 * and always paired with a text label rather than colour alone.
 */
const PU_STATUS: Record<PuStatus, { tone: BadgeTone; dot: string }> = {
  Open: { tone: "success", dot: "bg-success" },
  Delayed: { tone: "warning", dot: "bg-warning" },
  Issue: { tone: "destructive", dot: "bg-destructive" },
  Closed: { tone: "muted", dot: "bg-muted-foreground" },
};

const SEVERITY_TONE: Record<IncidentSeverity, BadgeTone> = {
  Critical: "destructive",
  High: "warning",
  Medium: "info",
  Low: "muted",
};

const INCIDENT_STATUS_TONE: Record<IncidentStatus, BadgeTone> = {
  Open: "warning",
  Escalated: "destructive",
  Resolved: "success",
};

export default function CommandCenter() {
  // Held in full so escalate/resolve edits survive a filter change.
  const [incidents, setIncidents] = useState<Incident[]>(INCIDENTS);
  const { inScope, pollingUnits, priorityAlerts, scopeLabel } = useScopedData();

  const visibleIncidents = incidents.filter((i) => inScope(i.state));
  const activeIncidents = visibleIncidents.filter((i) => i.status !== "Resolved").length;

  function update(id: string, status: IncidentStatus) {
    setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    toast.success(`Incident ${id.toUpperCase()} marked ${status.toLowerCase()}.`);
  }

  return (
    <>
      <PageHeader
        title="Election Command Center"
        subtitle={`Mission-critical oversight · ${scopeLabel}`}
        actions={
          <>
            <Badge tone="destructive" dot>
              {activeIncidents} active incidents
            </Badge>
            <Button
              variant="danger"
              onClick={() => toast.success("Broadcast queued to all 5,337 agents.")}
            >
              <Megaphone className="h-4 w-4" />
              Broadcast All Agents
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-[1.25fr_1fr]">
        <Panel
          title="Live Polling Unit Feed"
          subtitle={`${pollingUnits.length} units reporting · auto-refresh`}
          icon={<Radio className="h-4 w-4" />}
          action={
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-success">
              <span className="h-1.5 w-1.5 animate-ticker rounded-full bg-success" />
              Streaming
            </span>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {pollingUnits.map((u) => {
              const pct = Math.round((u.accredited / u.registered) * 100);
              const s = PU_STATUS[u.status];
              return (
                <li
                  key={u.id}
                  className="px-4 py-3.5 transition-colors hover:bg-secondary/30 sm:px-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[12px] font-semibold text-primary">
                        {u.code}
                      </p>
                      <p className="truncate text-[13px] font-medium">{u.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {u.state} · {u.lga} · {u.ward}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge tone={s.tone} dot>
                        {u.status}
                      </Badge>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {u.time}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <div className="flex items-baseline justify-between text-[11px]">
                      <span className="text-muted-foreground">Accreditation</span>
                      <span className="font-mono tabular-nums">
                        {u.accredited.toLocaleString()} / {u.registered.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <Meter
                      value={pct}
                      className="mt-1.5"
                      barClassName={
                        pct >= 70 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-destructive"
                      }
                    />
                  </div>
                </li>
              );
            })}
            {pollingUnits.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                No polling units reporting in {scopeLabel}.
              </li>
            )}
          </ul>
        </Panel>

        <div className="space-y-5">
          <Panel
            title="Polling Unit Map"
            subtitle="Color-coded by status"
            icon={<MapPinned className="h-4 w-4" />}
          >
            <div className="relative overflow-hidden rounded-lg border border-border bg-background/60 p-4">
              <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" aria-hidden />
              <div className="relative grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {pollingUnits.map((u) => {
                  const s = PU_STATUS[u.status];
                  return (
                    <div
                      key={u.id}
                      title={`${u.code} — ${u.status}`}
                      className="rounded-lg border border-border bg-card/80 p-2.5"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", s.dot)} />
                        <span className="truncate font-mono text-[10px] font-semibold">
                          {u.code}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[10px] text-muted-foreground">
                        {u.lga}
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold">{u.status}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              {(Object.keys(PU_STATUS) as PuStatus[]).map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5 text-[11px]">
                  <span className={cn("h-2 w-2 rounded-full", PU_STATUS[k].dot)} />
                  <span className="text-muted-foreground">{k}</span>
                </span>
              ))}
            </div>
          </Panel>

          <Panel
            title="High-Priority Alerts"
            subtitle="Escalated to the security desk"
            icon={<ShieldAlert className="h-4 w-4" />}
            bodyClassName="p-0"
          >
            <ul className="divide-y divide-border">
              {priorityAlerts.map((a) => (
                <li key={a.id} className="px-4 py-3 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13px] font-semibold leading-snug">{a.title}</p>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {a.time}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {a.body}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge tone={SEVERITY_TONE[a.severity]}>{a.severity}</Badge>
                    <span className="text-[10px] text-muted-foreground">{a.state}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel
        title="Incident Tracker"
        subtitle="Flag, escalate, resolve"
        icon={<AlertOctagon className="h-4 w-4" />}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-medium sm:px-5">Type</th>
                <th className="px-4 py-2.5 font-medium">Polling Unit</th>
                <th className="px-4 py-2.5 font-medium">State</th>
                <th className="px-4 py-2.5 font-medium">Severity</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium sm:px-5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleIncidents.map((i) => (
                <tr key={i.id} className="transition-colors hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium sm:px-5">{i.type}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-primary">{i.unit}</td>
                  <td className="px-4 py-3 text-muted-foreground">{i.state}</td>
                  <td className="px-4 py-3">
                    <Badge tone={SEVERITY_TONE[i.severity]}>{i.severity}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={INCIDENT_STATUS_TONE[i.status]}>{i.status}</Badge>
                  </td>
                  <td className="px-4 py-3 sm:px-5">
                    <div className="flex justify-end gap-1.5">
                      {i.status !== "Resolved" && (
                        <>
                          {i.status !== "Escalated" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => update(i.id, "Escalated")}
                            >
                              Escalate
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="subtle"
                            onClick={() => update(i.id, "Resolved")}
                          >
                            Resolve
                          </Button>
                        </>
                      )}
                      {i.status === "Resolved" && (
                        <span className="text-[11px] text-muted-foreground">Closed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleIncidents.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    No incidents logged in {scopeLabel}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
