import { Panel } from "../../components/ui/Panel";
import { Select } from "../../components/ui/Field";
import { ErrorState, LoadingRows } from "../../components/ui/AsyncState";
import { ParticipationShell } from "../../components/participation/ParticipationShell";
import { MetricsTable } from "../../components/participation/MetricsTable";
import {
  ParticipationEmpty,
  ParticipationKpi,
} from "../../components/participation/ParticipationKpi";
import { ConfidencePill, StatusPill } from "../../components/participation/Tags";
import { useParticipation } from "../../context/ParticipationContext";
import { useFilters } from "../../context/FilterContext";
import {
  useLevelRows,
  useNationalSummary,
  useParticipationSetup,
  useParticipationStats,
  useRegisterDiscrepancies,
} from "../../hooks/api/useParticipation";
import { formatCount, formatPercent, formatRelative, titleCase } from "../../lib/participation";

const MAX_ANOMALIES = 8;

/**
 * National participation. The register is the denominator on every rate, so a
 * state that has not reported reads as low turnout with low coverage rather
 * than as a confident number drawn from a handful of units.
 */
export default function Participation() {
  const { setVersionId } = useParticipation();
  const { apiCampaign, rootUnits } = useFilters();
  const { versions, version } = useParticipationSetup();
  const { entries, reports, qualityCases, lineage } = useParticipationStats();
  const national = useNationalSummary();
  const statesQuery = useLevelRows(rootUnits[0]?.id);
  const discrepancies = useRegisterDiscrepancies(apiCampaign?.id);

  const summary = national.summary;
  const states = statesQuery.rows;

  const unitByReport = new Map(reports.map((r) => [r.id, r.polling_unit_id]));
  const openAnomalies = qualityCases
    .filter((a) => a.status !== "dismissed" && a.status !== "resolved")
    .sort((a, b) => b.detected_at.localeCompare(a.detected_at));
  const openDiscrepancies = (discrepancies.data ?? []).filter(
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
          value={version?.id ?? ""}
          onChange={(e) => setVersionId(e.target.value || null)}
        >
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
      }
    >
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/80 px-3 py-2 shadow-card">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Register version
        </span>
        <span className="text-xs font-semibold">{version?.name ?? "—"}</span>
        <StatusPill
          value={version?.status}
          tone={version?.status === "published" ? "primary" : "warning"}
        />
        {/* A published register is immutable — the API's equivalent of locked. */}
        {version?.status === "published" && <StatusPill value="locked" tone="muted" />}
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
          {formatCount(entries.length)} polling units · {formatCount(reports.length)} reports
        </span>
      </div>

      {national.error && !summary ? (
        <Panel>
          <ErrorState error={national.error} onRetry={() => national.refetch()} />
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ParticipationKpi
            label="Registered voters"
            value={formatCount(summary?.registered)}
            provenance="inec_official"
            hint={version?.name}
          />
          <ParticipationKpi
            label="Voter coverage (primary)"
            value={formatPercent(summary?.metrics.voterCoverage)}
            provenance="sentinel_observed"
            hint={`${formatCount(summary?.coveredPus)}/${formatCount(summary?.totalPus)} PUs reporting`}
          />
          <ParticipationKpi
            label="Accreditation rate"
            value={formatPercent(summary?.metrics.accreditationRate)}
            provenance="sentinel_observed"
            hint={`${formatCount(summary?.accredited)} accredited`}
          />
          <ParticipationKpi
            label="Participation rate"
            value={formatPercent(summary?.metrics.participationRate)}
            provenance="sentinel_observed"
            hint={`${formatCount(summary?.participating)} participating`}
          />
          <ParticipationKpi
            label="Valid votes"
            value={formatCount(summary?.valid)}
            provenance="sentinel_observed"
            hint={formatPercent(summary?.metrics.validVoteRate)}
          />
          <ParticipationKpi
            label="Invalid votes"
            value={formatCount(summary?.invalid)}
            provenance="sentinel_observed"
            hint={`${formatPercent(summary?.metrics.invalidVoteRate)} of participating`}
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
      )}

      <Panel
        title="National confidence & historical comparison"
        action={summary && <ConfidencePill value={summary.confidence} />}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Observed turnout
            </p>
            <p className="font-mono text-xl font-semibold tabular-nums">
              {formatPercent(summary?.metrics.participationRate)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Historical benchmark
            </p>
            <p className="font-mono text-xl font-semibold tabular-nums">
              {formatPercent(summary?.historicalTurnout)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Difference
            </p>
            <p className="font-mono text-xl font-semibold">
              <DeltaBig value={summary?.historicalDelta ?? null} />
            </p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Verified reports: {formatCount(summary?.verifiedReports)} · Unverified:{" "}
          {formatCount(summary?.unverifiedReports)} · Last report{" "}
          {formatRelative(summary?.lastReportAt)}
        </p>
      </Panel>

      <Panel title="State participation table">
        {statesQuery.isLoading || national.isLoading ? (
          <LoadingRows rows={3} padded={false} />
        ) : statesQuery.error ? (
          <ErrorState error={statesQuery.error} onRetry={() => statesQuery.refetch()} />
        ) : states.length ? (
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
                <span className="font-semibold">{titleCase(a.rule_code.toLowerCase())}</span>
                <span className="text-muted-foreground">
                  {[lineage(unitByReport.get(a.report_id))?.unit.official_code, titleCase(a.status)]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
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
