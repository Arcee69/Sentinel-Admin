import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertOctagon, Loader2, Megaphone, MapPinned, Radio, ShieldAlert } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Badge, type BadgeTone } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Meter } from "../components/ui/Meter";
import { Modal } from "../components/ui/Modal";
import { Label, Textarea } from "../components/ui/Field";
import { ErrorState, LoadingRows } from "../components/ui/AsyncState";
import { type IncidentSeverity, type IncidentStatus, type PuStatus } from "../lib/data";
import { useFilters } from "../context/FilterContext";
import { useAuth } from "../context/AuthContext";
import {
  useCommandPollingUnits,
  useIncidentTransition,
  useIncidents,
  usePollingReportUnits,
} from "../hooks/api/useCommand";
import { usePollingOccasions } from "../hooks/api/useDashboard";
import { useUnitLineage } from "../hooks/useUnitNames";
import { useNow } from "../hooks/useNow";
import { humanize, relativeTime } from "../lib/format";
import { errorMessage, toApiError } from "../services/errors";
import type {
  ApiIncident,
  IncidentAction,
  IncidentSeverityCode,
  OperatingStatus,
} from "../services/command";
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

const SEVERITY_LABEL: Record<IncidentSeverityCode, IncidentSeverity> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** Unreported status reads as not-yet-open; any other reported state is an issue. */
function puStatus(status: OperatingStatus | null): PuStatus {
  if (status === "open") return "Open";
  if (status === "closed") return "Closed";
  if (status === "delayed" || status == null) return "Delayed";
  return "Issue";
}

function incidentStatus(status: string): IncidentStatus {
  if (status === "escalated") return "Escalated";
  if (status === "resolved") return "Resolved";
  return "Open";
}

function incidentType(i: ApiIncident): string {
  return humanize(i.incident_type ?? i.category ?? "incident");
}

const ACTION_COPY: Partial<Record<IncidentAction, { verb: string; done: string }>> = {
  escalate: { verb: "Escalate", done: "escalated" },
  resolve: { verb: "Resolve", done: "resolved" },
};

export default function CommandCenter() {
  const navigate = useNavigate();
  const { apiCampaign, scopeLabel, scopeUnit } = useFilters();
  const { access } = useAuth();
  const campaignId = apiCampaign?.id;
  const canManage = !!access?.can_manage;
  const now = useNow(30_000);

  const occasions = usePollingOccasions();
  const occasionId = occasions.data?.[0]?.id;
  const unitsQuery = useCommandPollingUnits(campaignId, occasionId);
  const reportUnits = usePollingReportUnits(campaignId);
  const incidentsQuery = useIncidents(campaignId);
  const transition = useIncidentTransition(campaignId);

  const [pending, setPending] = useState<{ incident: ApiIncident; action: IncidentAction } | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  // The command feed is keyed by polling report; the report carries the unit.
  const unitByReport = useMemo(
    () => new Map((reportUnits.data ?? []).map((r) => [r.id, r.polling_unit_id])),
    [reportUnits.data],
  );
  const commandUnits = unitsQuery.data?.polling_units;
  const incidents = incidentsQuery.data;
  const lineageIds = useMemo(
    () => [
      ...(commandUnits ?? []).map((u) => unitByReport.get(u.id)),
      ...(incidents ?? []).map((i) => i.geographic_unit_id),
    ],
    [commandUnits, incidents, unitByReport],
  );
  const lineage = useUnitLineage(lineageIds);

  /** Unplaced records stay visible rather than vanish under a state scope. */
  const inScope = (unitId: string | null | undefined) => {
    if (!scopeUnit) return true;
    const state = lineage(unitId)?.state;
    return !state || state.id === scopeUnit.id;
  };

  const pollingUnits = (commandUnits ?? []).filter((u) => inScope(unitByReport.get(u.id)));
  const codeByPlace = new Map((commandUnits ?? []).map((u) => [u.polling_place_id, u.official_code]));

  const visibleIncidents = (incidents ?? [])
    .filter((i) => inScope(i.geographic_unit_id))
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  const activeIncidents = visibleIncidents.filter((i) => i.status !== "resolved").length;
  const priorityAlerts = visibleIncidents.filter(
    (i) => i.status !== "resolved" && (i.severity === "critical" || i.severity === "high"),
  );

  function unitCode(i: ApiIncident) {
    return (
      (i.polling_place_id && codeByPlace.get(i.polling_place_id)) ??
      lineage(i.geographic_unit_id)?.unit.official_code ??
      "—"
    );
  }

  function ask(incident: ApiIncident, action: IncidentAction) {
    setReason("");
    setReasonError("");
    setPending({ incident, action });
  }

  function submitTransition() {
    if (!pending) return;
    if (!reason.trim()) {
      setReasonError("Give a short reason — it's recorded on the incident timeline.");
      return;
    }
    const { incident, action } = pending;
    transition.mutate(
      { incidentId: incident.id, action, reason: reason.trim(), expected_revision: incident.revision },
      {
        onSuccess: () => {
          toast.success(`Incident ${unitCode(incident)} marked ${ACTION_COPY[action]?.done}.`);
          setPending(null);
        },
        onError: (err) => {
          const e = toApiError(err);
          if (e.isValidation && e.fieldErrors.reason) {
            setReasonError(e.fieldErrors.reason);
            return;
          }
          toast.error(
            e.isConflict
              ? "This incident changed since it loaded. The tracker has been refreshed — try again."
              : errorMessage(e),
          );
          setPending(null);
        },
      },
    );
  }

  const feedLoading = occasions.isLoading || unitsQuery.isLoading;
  const feedError = occasions.error ?? unitsQuery.error;

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
            <Button variant="danger" onClick={() => navigate("/communications")}>
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
          {feedLoading ? (
            <LoadingRows rows={4} />
          ) : feedError ? (
            <ErrorState
              error={feedError}
              onRetry={() => (occasions.isError ? occasions.refetch() : unitsQuery.refetch())}
            />
          ) : (
            <ul className="divide-y divide-border">
              {pollingUnits.map((u) => {
                const registered = u.registered_count ?? 0;
                const accredited = u.accredited_persons ?? 0;
                const pct = registered ? Math.round((accredited / registered) * 100) : 0;
                const status = puStatus(u.operating_status);
                const s = PU_STATUS[status];
                const place = lineage(unitByReport.get(u.id));
                return (
                  <li
                    key={u.id}
                    className="px-4 py-3.5 transition-colors hover:bg-secondary/30 sm:px-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[12px] font-semibold text-primary">
                          {u.official_code}
                        </p>
                        <p className="truncate text-[13px] font-medium">{u.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {[place?.state?.name, place?.lga?.name, place?.ward?.name]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge tone={s.tone} dot>
                          {status}
                        </Badge>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                          {relativeTime(u.received_at, now)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5">
                      <div className="flex items-baseline justify-between text-[11px]">
                        <span className="text-muted-foreground">Accreditation</span>
                        <span className="font-mono tabular-nums">
                          {u.accredited_persons == null ? "—" : accredited.toLocaleString()} /{" "}
                          {u.registered_count == null ? "—" : registered.toLocaleString()} ({pct}%)
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
          )}
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
                  const status = puStatus(u.operating_status);
                  const s = PU_STATUS[status];
                  const place = lineage(unitByReport.get(u.id));
                  return (
                    <div
                      key={u.id}
                      title={`${u.official_code} — ${status}`}
                      className="rounded-lg border border-border bg-card/80 p-2.5"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", s.dot)} />
                        <span className="truncate font-mono text-[10px] font-semibold">
                          {u.official_code}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[10px] text-muted-foreground">
                        {place?.lga?.name ?? u.name}
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold">{status}</p>
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
            {incidentsQuery.isLoading ? (
              <LoadingRows rows={2} />
            ) : incidentsQuery.isError ? (
              <ErrorState error={incidentsQuery.error} onRetry={() => incidentsQuery.refetch()} />
            ) : (
              <ul className="divide-y divide-border">
                {priorityAlerts.map((a) => {
                  const severity = SEVERITY_LABEL[a.severity] ?? "Medium";
                  return (
                    <li key={a.id} className="px-4 py-3 sm:px-5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[13px] font-semibold leading-snug">
                          {incidentType(a)} — {unitCode(a)}
                        </p>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {relativeTime(a.occurred_at, now)}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {a.description}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge tone={SEVERITY_TONE[severity]}>{severity}</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {lineage(a.geographic_unit_id)?.state?.name ?? ""}
                        </span>
                      </div>
                    </li>
                  );
                })}
                {priorityAlerts.length === 0 && (
                  <li className="px-5 py-8 text-center text-sm text-muted-foreground">
                    No high-priority incidents in {scopeLabel}.
                  </li>
                )}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <Panel
        title="Incident Tracker"
        subtitle="Flag, escalate, resolve"
        icon={<AlertOctagon className="h-4 w-4" />}
        bodyClassName="p-0"
      >
        {incidentsQuery.isLoading ? (
          <LoadingRows rows={3} />
        ) : incidentsQuery.isError ? (
          <ErrorState error={incidentsQuery.error} onRetry={() => incidentsQuery.refetch()} />
        ) : (
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
                {visibleIncidents.map((i) => {
                  const severity = SEVERITY_LABEL[i.severity] ?? "Medium";
                  const status = incidentStatus(i.status);
                  return (
                    <tr key={i.id} className="transition-colors hover:bg-secondary/30">
                      <td className="px-4 py-3 font-medium sm:px-5">{incidentType(i)}</td>
                      <td className="px-4 py-3 font-mono text-[12px] text-primary">
                        {unitCode(i)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {lineage(i.geographic_unit_id)?.state?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={SEVERITY_TONE[severity]}>{severity}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={INCIDENT_STATUS_TONE[status]}>{status}</Badge>
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex justify-end gap-1.5">
                          {status !== "Resolved" && canManage && (
                            <>
                              {status !== "Escalated" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => ask(i, "escalate")}
                                >
                                  Escalate
                                </Button>
                              )}
                              <Button size="sm" variant="subtle" onClick={() => ask(i, "resolve")}>
                                Resolve
                              </Button>
                            </>
                          )}
                          {status === "Resolved" && (
                            <span className="text-[11px] text-muted-foreground">Closed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
        )}
      </Panel>

      <Modal
        open={!!pending}
        onClose={() => !transition.isPending && setPending(null)}
        title={`${pending ? ACTION_COPY[pending.action]?.verb : ""} incident`}
        description={
          pending ? `${incidentType(pending.incident)} at ${unitCode(pending.incident)}` : undefined
        }
        icon={<AlertOctagon className="h-4.5 w-4.5" />}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setPending(null)}
              disabled={transition.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={pending?.action === "escalate" ? "danger" : "primary"}
              onClick={submitTransition}
              disabled={transition.isPending}
            >
              {transition.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? ACTION_COPY[pending.action]?.verb : ""}
            </Button>
          </div>
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="transition-reason">Reason</Label>
          <Textarea
            id="transition-reason"
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setReasonError("");
            }}
            placeholder={
              pending?.action === "escalate"
                ? "Why does this need the security desk?"
                : "How was this resolved?"
            }
            aria-invalid={!!reasonError}
          />
          {reasonError && <p className="text-[11px] text-destructive">{reasonError}</p>}
        </div>
      </Modal>
    </>
  );
}
