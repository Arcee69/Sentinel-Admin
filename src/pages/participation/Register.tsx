import { useMemo } from "react";
import { toast } from "sonner";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { ParticipationShell } from "../../components/participation/ParticipationShell";
import {
  ParticipationEmpty,
  ParticipationKpi,
} from "../../components/participation/ParticipationKpi";
import { StatusPill } from "../../components/participation/Tags";
import { useParticipation } from "../../context/ParticipationContext";
import {
  canLockRegister,
  canVerify,
  DISCREPANCY_STATUSES,
  formatCount,
  formatPercent,
  formatRelative,
  reconciliationLabel,
  stateRows,
  statusTone,
  titleCase,
  type DiscrepancyStatus,
} from "../../lib/participation";

const DISCREPANCY_LIMIT = 60;

/**
 * Register versioning and baseline-versus-field reconciliation.
 *
 * The register is the one thing on this platform the field cannot change. Every
 * disagreement is recorded against the baseline rather than applied to it, and
 * a verified version is locked so it cannot drift afterwards.
 */
export default function Register() {
  const { data, role, setVersionStatus, resolveDiscrepancy } = useParticipation();

  const mayLock = canLockRegister(role);
  const mayResolve = canVerify(role);

  const states = useMemo(() => stateRows(data), [data]);
  const byId = useMemo(() => new Map(data.rows.map((r) => [r.id, r])), [data]);

  const discrepancies = data.discrepancies;
  const open = discrepancies.filter((d) => d.status === "open" || d.status === "reviewing");
  const material = discrepancies.filter((d) => d.severity === "material");
  const baselines = data.rows.filter((r) => r.registered != null).length;

  const resolve = (id: string, status: DiscrepancyStatus) => {
    resolveDiscrepancy(id, status);
    toast.success(`Discrepancy ${status.replace(/_/g, " ")}`);
  };

  return (
    <ParticipationShell
      title="Register & Reconciliation"
      subtitle="Register versioning (2023 · 2025/26 updates · 2027 final) with baseline-versus-field reconciliation"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ParticipationKpi
          label="Register versions"
          value={formatCount(data.versions.length)}
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
        {data.versions.length === 0 ? (
          <ParticipationEmpty message="No register versions configured." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-xs">
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
                {data.versions.map((v) => (
                  <tr key={v.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-3 font-semibold">{v.label}</td>
                    <td className="py-2 pr-3 tabular-nums">{v.register_year || "—"}</td>
                    <td className="py-2 pr-3">{titleCase(v.kind)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{v.source}</td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-1">
                        <StatusPill
                          value={v.verification_status}
                          tone={
                            v.verification_status === "verified"
                              ? "primary"
                              : v.verification_status === "disputed"
                                ? "destructive"
                                : "warning"
                          }
                        />
                        {v.is_locked && <StatusPill value="locked" tone="muted" />}
                      </div>
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {v.id === data.activeVersionId ? formatCount(baselines) : "—"}
                    </td>
                    <td className="py-2 pr-3">
                      {mayLock && !v.is_locked ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setVersionStatus(v.id, "pending_review")}
                          >
                            Review
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setVersionStatus(v.id, "verified", true);
                              toast.success("Version verified and locked");
                            }}
                          >
                            Verify &amp; lock
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {v.is_locked ? "Immutable" : "Read-only"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="State-level reconciliation">
        {states.length === 0 ? (
          <ParticipationEmpty message="No register baselines to reconcile yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-xs">
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
                  const inState = discrepancies.filter(
                    (d) => byId.get(d.polling_unit_id)?.state === s.state,
                  );
                  const verdict = inState.some((d) => d.severity === "material")
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
        {discrepancies.length === 0 ? (
          <ParticipationEmpty
            message="No discrepancies raised."
            hint="A discrepancy is created automatically whenever a field-confirmed register figure differs from the INEC baseline."
          />
        ) : (
          <ul className="space-y-2">
            {discrepancies.slice(0, DISCREPANCY_LIMIT).map((d) => {
              const row = byId.get(d.polling_unit_id);
              const verdict = reconciliationLabel(d.difference, d.inec_registered_voters);
              return (
                <li key={d.id} className="rounded-lg border border-border/60 p-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {row
                        ? `${row.inec_pu_id} · ${row.ward}, ${row.lga}, ${row.state}`
                        : "Unknown polling unit"}
                    </span>
                    <StatusPill value={verdict} tone={statusTone(verdict)} />
                    <StatusPill value={d.status} tone={d.status === "open" ? "warning" : "muted"} />
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {formatRelative(d.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                    INEC {formatCount(d.inec_registered_voters)} · reported{" "}
                    {formatCount(d.reported_registered_voters)} · difference{" "}
                    {d.difference > 0 ? "+" : ""}
                    {formatCount(d.difference)}
                  </p>
                  {d.note && <p className="mt-1 text-[11px] text-muted-foreground">{d.note}</p>}
                  {mayResolve && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {DISCREPANCY_STATUSES.filter((s) => s !== d.status).map((s) => (
                        <Button key={s} size="sm" variant="ghost" onClick={() => resolve(d.id, s)}>
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
    </ParticipationShell>
  );
}
