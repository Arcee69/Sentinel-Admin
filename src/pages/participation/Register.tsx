import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { ErrorState, LoadingRows } from "../../components/ui/AsyncState";
import { ReasonDialog } from "../../components/ui/ReasonDialog";
import { ParticipationShell } from "../../components/participation/ParticipationShell";
import {
  ParticipationEmpty,
  ParticipationKpi,
} from "../../components/participation/ParticipationKpi";
import { StatusPill } from "../../components/participation/Tags";
import { useAuth } from "../../context/AuthContext";
import { useFilters } from "../../context/FilterContext";
import {
  useLevelRows,
  useParticipationSetup,
  useParticipationStats,
  usePublishRegister,
  useRegisterDiscrepancies,
  useTransitionDiscrepancy,
} from "../../hooks/api/useParticipation";
import {
  formatCount,
  formatPercent,
  formatRelative,
  reconciliationLabel,
  statusTone,
  titleCase,
} from "../../lib/participation";
import { errorMessage, toApiError } from "../../services/errors";
import type {
  DiscrepancyNextStatus,
  RegisterDiscrepancyRecord,
} from "../../services/participation";

const DISCREPANCY_LIMIT = 60;

/** Where a discrepancy can go; "dismissed" means the INEC baseline stands. */
const DISCREPANCY_STATUSES: DiscrepancyNextStatus[] = [
  "reviewing",
  "resolved_register_updated",
  "dismissed",
];

/**
 * Register versioning and baseline-versus-field reconciliation.
 *
 * The register is the one thing on this platform the field cannot change. Every
 * disagreement is recorded against the baseline rather than applied to it, and
 * a published version is immutable so it cannot drift afterwards.
 */
export default function Register() {
  const { access } = useAuth();
  const { apiCampaign, rootUnits } = useFilters();
  const { versions, version: activeVersion, isLoading: versionsLoading } = useParticipationSetup();
  const { entries, reports, lineage } = useParticipationStats();
  const statesQuery = useLevelRows(rootUnits[0]?.id);
  const discrepanciesQuery = useRegisterDiscrepancies(apiCampaign?.id);
  const publish = usePublishRegister();
  const transition = useTransitionDiscrepancy();
  const [pending, setPending] = useState<{
    record: RegisterDiscrepancyRecord;
    status: DiscrepancyNextStatus;
  } | null>(null);
  const [reasonError, setReasonError] = useState<string>();

  const mayLock = access?.role === "admin";
  const mayResolve = !!access?.can_manage;
  const states = statesQuery.rows;

  // Discrepancies carry only IDs; join the baseline entry, its unit and the report.
  const discrepancies = useMemo(() => {
    const entriesById = new Map(entries.map((e) => [e.id, e]));
    const reportsById = new Map(reports.map((r) => [r.id, r]));
    return (discrepanciesQuery.data ?? []).map((d) => {
      const entry = entriesById.get(d.baseline_entry_id);
      const inec = entry?.registered_count ?? null;
      const difference = inec == null ? null : d.reported_count - inec;
      return {
        record: d,
        inec,
        difference,
        verdict: inec == null || difference == null ? "requires_review" : reconciliationLabel(difference, inec),
        place: lineage(entry?.polling_unit_id),
        reportedAt: reportsById.get(d.report_id)?.received_at ?? null,
      };
    });
  }, [discrepanciesQuery.data, entries, reports, lineage]);

  const open = discrepancies.filter(
    (d) => d.record.status === "open" || d.record.status === "reviewing",
  );
  const material = discrepancies.filter((d) => d.verdict === "material_difference");
  const baselines = entries.length;

  function lock(versionId: string) {
    publish.mutate(versionId, {
      onSuccess: () => toast.success("Version verified and locked"),
      onError: (err) => toast.error(errorMessage(err)),
    });
  }

  function confirmTransition(reason: string) {
    if (!pending) return;
    const { record, status } = pending;
    transition.mutate(
      {
        discrepancyId: record.id,
        next_status: status,
        reason,
        expected_revision: record.revision,
      },
      {
        onSuccess: () => {
          toast.success(`Discrepancy ${status.replace(/_/g, " ")}`);
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
              ? "This discrepancy changed since it loaded. The list has been refreshed — try again."
              : errorMessage(e),
          );
          setPending(null);
        },
      },
    );
  }

  return (
    <ParticipationShell
      title="Register & Reconciliation"
      subtitle="Register versioning (2023 · 2025/26 updates · 2027 final) with baseline-versus-field reconciliation"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ParticipationKpi
          label="Register versions"
          value={formatCount(versions.length)}
          provenance="inec_official"
        />
        <ParticipationKpi
          label="Baselines loaded"
          value={formatCount(baselines)}
          provenance="inec_official"
        />
        <ParticipationKpi
          label="Open discrepancies"
          value={formatCount(open.length)}
          tone={open.length ? "warning" : "default"}
        />
        <ParticipationKpi
          label="Material differences"
          value={formatCount(material.length)}
          tone={material.length ? "danger" : "default"}
        />
      </div>

      <Panel title="Register versions">
        {versionsLoading ? (
          <LoadingRows rows={2} padded={false} />
        ) : versions.length === 0 ? (
          <ParticipationEmpty message="No register versions configured." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-200 text-xs">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Version</th>
                  <th className="py-2 pr-3 font-medium">Year</th>
                  <th className="py-2 pr-3 font-medium">Kind</th>
                  <th className="py-2 pr-3 font-medium">Source</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Baselines</th>
                  <th className="py-2 pr-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => {
                  // A published register is immutable — the API's equivalent of locked.
                  const locked = v.status === "published";
                  return (
                    <tr key={v.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-3 font-semibold">{v.name}</td>
                      <td className="py-2 pr-3 tabular-nums">{v.year || "—"}</td>
                      <td className="py-2 pr-3">—</td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {v.import
                          ? `${titleCase(v.import.status)} import · ${formatCount(v.import.row_count)} rows${
                              v.import.error_count ? ` · ${v.import.error_count} errors` : ""
                            }`
                          : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-1">
                          <StatusPill value={v.status} tone={locked ? "primary" : "warning"} />
                          {locked && <StatusPill value="locked" tone="muted" />}
                        </div>
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {v.id === activeVersion?.id ? formatCount(baselines) : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {mayLock && !locked ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={publish.isPending}
                            onClick={() => lock(v.id)}
                          >
                            Verify &amp; lock
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            {locked ? "Immutable" : "Read-only"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="State-level reconciliation">
        {statesQuery.isLoading ? (
          <LoadingRows rows={2} padded={false} />
        ) : statesQuery.error ? (
          <ErrorState error={statesQuery.error} onRetry={() => statesQuery.refetch()} />
        ) : states.length === 0 ? (
          <ParticipationEmpty message="No register baselines to reconcile yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-225 text-xs">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">State</th>
                  <th className="py-2 pr-3 text-right font-medium">INEC registered</th>
                  <th className="py-2 pr-3 text-right font-medium">Covered by reports</th>
                  <th className="py-2 pr-3 text-right font-medium">Coverage</th>
                  <th className="py-2 pr-3 text-right font-medium">Verified reports</th>
                  <th className="py-2 pr-3 font-medium">Reconciliation</th>
                </tr>
              </thead>
              <tbody>
                {states.map((s) => {
                  const inState = discrepancies.filter((d) => d.place?.state?.id === s.key);
                  const verdict = inState.some((d) => d.verdict === "material_difference")
                    ? "material_difference"
                    : inState.length
                      ? "minor_difference"
                      : s.coveredPus === 0
                        ? "requires_review"
                        : s.unverifiedReports === 0
                          ? "verified"
                          : "matched";

                  return (
                    <tr key={s.key} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-3 font-semibold">{s.label}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatCount(s.registered)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatCount(s.coveredRegistered)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatPercent(s.metrics.voterCoverage)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {s.verifiedReports}/{s.verifiedReports + s.unverifiedReports}
                      </td>
                      <td className="py-2 pr-3">
                        <StatusPill value={verdict} tone={statusTone(verdict)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Register discrepancies">
        {discrepanciesQuery.isLoading ? (
          <LoadingRows rows={2} padded={false} />
        ) : discrepanciesQuery.error ? (
          <ErrorState
            error={discrepanciesQuery.error}
            onRetry={() => discrepanciesQuery.refetch()}
          />
        ) : discrepancies.length === 0 ? (
          <ParticipationEmpty
            message="No discrepancies raised."
            hint="A discrepancy is created automatically whenever a field-confirmed register figure differs from the INEC baseline."
          />
        ) : (
          <ul className="space-y-2">
            {discrepancies.slice(0, DISCREPANCY_LIMIT).map((d) => {
              const { record, place } = d;
              return (
                <li key={record.id} className="rounded-lg border border-border/60 p-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {place
                        ? [
                            place.unit.official_code,
                            [place.ward?.name, place.lga?.name, place.state?.name]
                              .filter(Boolean)
                              .join(", "),
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : "Unknown polling unit"}
                    </span>
                    <StatusPill value={d.verdict} tone={statusTone(d.verdict)} />
                    <StatusPill
                      value={record.status}
                      tone={record.status === "open" ? "warning" : "muted"}
                    />
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {formatRelative(d.reportedAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                    INEC {formatCount(d.inec)} · reported {formatCount(record.reported_count)} ·
                    difference {d.difference != null && d.difference > 0 ? "+" : ""}
                    {formatCount(d.difference)}
                  </p>
                  {mayResolve && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {DISCREPANCY_STATUSES.filter((s) => s !== record.status).map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant="ghost"
                          onClick={() => setPending({ record, status: s })}
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

      {pending && (
        <ReasonDialog
          key={`${pending.record.id}:${pending.status}`}
          open
          title={`Mark discrepancy ${titleCase(pending.status).toLowerCase()}`}
          description={
            pending.status === "dismissed"
              ? "The INEC baseline stands; the field figure is set aside."
              : pending.status === "resolved_register_updated"
                ? "Use once a corrected register version has been imported."
                : undefined
          }
          confirmLabel={titleCase(pending.status)}
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
