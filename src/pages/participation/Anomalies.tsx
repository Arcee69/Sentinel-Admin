import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Field";
import { LoadingRows } from "../../components/ui/AsyncState";
import { ReasonDialog } from "../../components/ui/ReasonDialog";
import { ParticipationShell } from "../../components/participation/ParticipationShell";
import {
  ParticipationEmpty,
  ParticipationKpi,
} from "../../components/participation/ParticipationKpi";
import { StatusPill } from "../../components/participation/Tags";
import { useAuth } from "../../context/AuthContext";
import {
  usePollingUnitRows,
  useParticipationStats,
  useTransitionQualityCase,
} from "../../hooks/api/useParticipation";
import {
  ANOMALY_STATUSES,
  formatCount,
  formatRelative,
  titleCase,
  type AnomalyStatus,
} from "../../lib/participation";
import { errorMessage, toApiError } from "../../services/errors";
import type { QualityCase, QualityCaseNextStatus } from "../../services/participation";

const FILTERS = [...ANOMALY_STATUSES, "all"] as const;
type Filter = (typeof FILTERS)[number];

const QUEUE_LIMIT = 100;

/** Quality cases can move to these; the API never sends one back to "open". */
const NEXT_STATUSES: QualityCaseNextStatus[] = ["reviewing", "confirmed", "dismissed"];

/** "PARTICIPATION_EXCEEDS_LIMIT" → "Participation exceeds limit". */
const ruleLabel = (code: string) => titleCase(code.toLowerCase());

/**
 * The analyst queue. Quality cases are raised by the API's rules when a
 * report is received — nothing here is inferred after the fact, so an empty
 * queue genuinely means nothing tripped a rule.
 */
export default function Anomalies() {
  const { access } = useAuth();
  const { qualityCases, reports, lineage, isLoading } = useParticipationStats();
  const { rows } = usePollingUnitRows();
  const transition = useTransitionQualityCase();
  const [filter, setFilter] = useState<Filter>("open");
  const [pending, setPending] = useState<{ item: QualityCase; status: QualityCaseNextStatus } | null>(
    null,
  );
  const [reasonError, setReasonError] = useState<string>();

  const mayReview = !!access?.can_manage;
  const unitByReport = useMemo(
    () => new Map(reports.map((r) => [r.id, r.polling_unit_id])),
    [reports],
  );

  const queue = qualityCases
    .filter((a) => filter === "all" || a.status === filter)
    .sort((a, b) => b.detected_at.localeCompare(a.detected_at));

  const silent = useMemo(() => rows.filter((r) => !r.report), [rows]);

  const mix = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of qualityCases) {
      if (a.status === "dismissed") continue;
      counts.set(a.rule_code, (counts.get(a.rule_code) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [qualityCases]);

  function confirmTransition(reason: string) {
    if (!pending) return;
    const { item, status } = pending;
    transition.mutate(
      { caseId: item.id, next_status: status, reason, expected_revision: item.revision },
      {
        onSuccess: () => {
          toast.success(`Anomaly ${status}`);
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
              ? "This anomaly changed since it loaded. The queue has been refreshed — try again."
              : errorMessage(e),
          );
          setPending(null);
        },
      },
    );
  }

  const count = (status: AnomalyStatus) => qualityCases.filter((a) => a.status === status).length;

  return (
    <ParticipationShell
      title="Anomaly Detection"
      subtitle="Impossible figures, duplicate submissions, silent polling units and register anomalies"
      actions={
        <Select
          aria-label="Anomaly status filter"
          className="w-40 text-xs"
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
        >
          {FILTERS.map((f) => (
            <option key={f} value={f}>
              {titleCase(f)}
            </option>
          ))}
        </Select>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ParticipationKpi label="Open anomalies" value={formatCount(count("open"))} tone="warning" />
        <ParticipationKpi label="Confirmed" value={formatCount(count("confirmed"))} tone="danger" />
        <ParticipationKpi label="Dismissed" value={formatCount(count("dismissed"))} />
        <ParticipationKpi
          label="Silent polling units"
          value={formatCount(silent.length)}
          hint="Register loaded, no report received"
          tone={silent.length ? "warning" : "default"}
        />
      </div>

      <Panel title="Anomaly mix">
        {isLoading ? (
          <LoadingRows rows={2} padded={false} />
        ) : mix.length === 0 ? (
          <ParticipationEmpty message="No anomalies detected." />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {mix.map(([type, n]) => (
              <li
                key={type}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-xs"
              >
                <span>{ruleLabel(type)}</span>
                <span className="font-semibold tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Anomaly queue">
        {isLoading ? (
          <LoadingRows rows={3} padded={false} />
        ) : queue.length === 0 ? (
          <ParticipationEmpty
            message="Nothing in this queue."
            hint="Anomalies are raised at submission time and by reconciliation, never by guesswork."
          />
        ) : (
          <ul className="space-y-2">
            {queue.slice(0, QUEUE_LIMIT).map((a) => {
              const place = lineage(unitByReport.get(a.report_id));
              return (
                <li key={a.id} className="rounded-lg border border-border/60 p-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill
                      value={a.severity}
                      tone={
                        ["critical", "high", "error"].includes(a.severity) ? "destructive" : "warning"
                      }
                    />
                    <span className="font-semibold">{ruleLabel(a.rule_code)}</span>
                    <StatusPill
                      value={a.status}
                      tone={
                        a.status === "confirmed"
                          ? "destructive"
                          : a.status === "dismissed"
                            ? "muted"
                            : "warning"
                      }
                    />
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {formatRelative(a.detected_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {place
                      ? [
                          place.unit.official_code,
                          [place.ward?.name, place.lga?.name, place.state?.name]
                            .filter(Boolean)
                            .join(", "),
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "Unlinked polling unit"}{" "}
                    — {a.rule_code} rule v{a.rule_version}
                  </p>
                  {mayReview && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {NEXT_STATUSES.filter((s) => s !== a.status).map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant="ghost"
                          onClick={() => setPending({ item: a, status: s })}
                        >
                          {titleCase(s)}
                        </Button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Silent polling units">
        {silent.length === 0 ? (
          <ParticipationEmpty message="Every polling unit with a register baseline has reported." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-150 text-xs">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Polling unit</th>
                  <th className="py-2 pr-3 font-medium">Location</th>
                  <th className="py-2 pr-3 text-right font-medium">Registered</th>
                </tr>
              </thead>
              <tbody>
                {silent.slice(0, QUEUE_LIMIT).map((row) => (
                  <tr key={row.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-3 font-semibold">{row.code}</td>
                    <td className="py-2 pr-3 text-[11px] text-muted-foreground">
                      {[row.ward, row.lga, row.state].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {formatCount(row.registered)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {pending && (
        <ReasonDialog
          key={`${pending.item.id}:${pending.status}`}
          open
          title={`Mark anomaly ${pending.status}`}
          description={ruleLabel(pending.item.rule_code)}
          confirmLabel={titleCase(pending.status)}
          danger={pending.status === "confirmed"}
          busy={transition.isPending}
          error={reasonError}
          onConfirm={confirmTransition}
          onClose={() => {
            setPending(null);
            setReasonError(undefined);
          }}
        />
      )}
    </ParticipationShell>
  );
}
