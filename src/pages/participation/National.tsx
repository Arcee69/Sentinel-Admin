import { useMemo } from "react";
import { Panel } from "../../components/ui/Panel";
import { Select } from "../../components/ui/Field";
import { ParticipationShell } from "../../components/participation/ParticipationShell";
import { MetricsTable } from "../../components/participation/MetricsTable";
import {
  ParticipationEmpty,
  ParticipationKpi,
} from "../../components/participation/ParticipationKpi";
import { ConfidencePill, StatusPill } from "../../components/participation/Tags";
import { useParticipation } from "../../context/ParticipationContext";
import {
  ANOMALY_LABELS,
  formatCount,
  formatPercent,
  formatRelative,
  nationalSummary,
  stateRows,
  titleCase,
} from "../../lib/participation";

const MAX_ANOMALIES = 8;

/**
 * National participation. The register is the denominator on every rate, so a
 * state that has not reported reads as low turnout with low coverage rather
 * than as a confident number drawn from a handful of units.
 */
export default function Participation() {
  const { data, versionId, setVersionId } = useParticipation();

  const summary = useMemo(() => nationalSummary(data), [data]);
  const states = useMemo(() => stateRows(data), [data]);

  const version =
    data.versions.find((v) => v.id === (versionId ?? data.activeVersionId)) ?? null;

  const openAnomalies = data.anomalies.filter((a) => a.status !== "dismissed");
  const openDiscrepancies = data.discrepancies.filter(
    (d) => d.status === "open" || d.status === "reviewing",
  );

  return (
    <ParticipationShell
      title="Voter Participation Intelligence"
      subtitle="INEC registered voters as the anchor · Sentinel polling-unit observation as the signal"
      actions={
        <Select
          aria-label="Register version"
          className="w-64 text-xs"
          value={versionId ?? data.activeVersionId ?? ""}
          onChange={(e) => setVersionId(e.target.value || null)}
        >
          {data.versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </Select>
      }
    >
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/80 px-3 py-2 shadow-card">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Register version
        </span>
        <span className="text-xs font-semibold">{version?.label ?? "—"}</span>
        <StatusPill
          value={version?.verification_status}
          tone={version?.verification_status === "verified" ? "primary" : "warning"}
        />
        {version?.is_locked && <StatusPill value="locked" tone="muted" />}
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
          {formatCount(data.rows.length)} polling units · {formatCount(data.reportCount)} reports
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ParticipationKpi
          label="Registered voters"
          value={formatCount(summary.registered)}
          provenance="inec_official"
          hint={version?.label}
        />
        <ParticipationKpi
          label="Voter coverage (primary)"
          value={formatPercent(summary.metrics.voterCoverage)}
          provenance="sentinel_observed"
          hint={`${formatCount(summary.coveredPus)}/${formatCount(summary.totalPus)} PUs reporting`}
        />
        <ParticipationKpi
          label="Accreditation rate"
          value={formatPercent(summary.metrics.accreditationRate)}
          provenance="sentinel_observed"
          hint={`${formatCount(summary.accredited)} accredited`}
        />
        <ParticipationKpi
          label="Participation rate"
          value={formatPercent(summary.metrics.participationRate)}
          provenance="sentinel_observed"
          hint={`${formatCount(summary.participating)} participating`}
        />
        <ParticipationKpi
          label="Valid votes"
          value={formatCount(summary.valid)}
          provenance="sentinel_observed"
          hint={formatPercent(summary.metrics.validVoteRate)}
        />
        <ParticipationKpi
          label="Invalid votes"
          value={formatCount(summary.invalid)}
          provenance="sentinel_observed"
          hint={`${formatPercent(summary.metrics.invalidVoteRate)} of participating`}
          tone="warning"
        />
        <ParticipationKpi
          label="Open anomalies"
          value={formatCount(openAnomalies.length)}
          hint="Flagged for analyst review"
          tone={openAnomalies.length ? "danger" : "default"}
        />
        <ParticipationKpi
          label="Register discrepancies"
          value={formatCount(openDiscrepancies.length)}
          hint="Field figure vs INEC baseline"
          tone={openDiscrepancies.length ? "warning" : "default"}
        />
      </div>

      <Panel
        title="National confidence & historical comparison"
        action={<ConfidencePill value={summary.confidence} />}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Observed turnout
            </p>
            <p className="font-mono text-xl font-semibold tabular-nums">
              {formatPercent(summary.metrics.participationRate)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Historical benchmark
            </p>
            <p className="font-mono text-xl font-semibold tabular-nums">
              {formatPercent(summary.historicalTurnout)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Difference
            </p>
            <p className="font-mono text-xl font-semibold">
              <DeltaBig value={summary.historicalDelta} />
            </p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Verified reports: {formatCount(summary.verifiedReports)} · Unverified:{" "}
          {formatCount(summary.unverifiedReports)} · Last report{" "}
          {formatRelative(summary.lastReportAt)}
        </p>
      </Panel>

      <Panel title="State participation table">
        {states.length ? (
          <MetricsTable rows={states} levelLabel="State" />
        ) : (
          <ParticipationEmpty message="No polling units loaded yet." />
        )}
      </Panel>

      <Panel title="Latest anomaly flags">
        {openAnomalies.length ? (
          <ul className="space-y-2">
            {openAnomalies.slice(0, MAX_ANOMALIES).map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 p-2 text-xs"
              >
                <StatusPill
                  value={a.severity}
                  tone={a.severity === "critical" || a.severity === "high" ? "destructive" : "warning"}
                />
                <span className="font-semibold">
                  {ANOMALY_LABELS[a.anomaly_type] ?? titleCase(a.anomaly_type)}
                </span>
                <span className="text-muted-foreground">{a.detail}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {formatRelative(a.detected_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <ParticipationEmpty
            message="No open anomalies."
            hint="Anomalies are raised automatically when reported figures are internally impossible or duplicated."
          />
        )}
      </Panel>
    </ParticipationShell>
  );
}

/** The headline difference, sized to sit beside the two figures it compares. */
function DeltaBig({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={
        value > 0 ? "text-success" : value < 0 ? "text-destructive" : "text-muted-foreground"
      }
    >
      {value > 0 ? "+" : ""}
      {value.toFixed(2)} pp
    </span>
  );
}
