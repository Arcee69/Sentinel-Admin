import { useEffect, useMemo, useState } from "react";
import { Radio } from "lucide-react";
import { Panel } from "../../components/ui/Panel";
import { ErrorState, LoadingRows } from "../../components/ui/AsyncState";
import { ParticipationShell } from "../../components/participation/ParticipationShell";
import { MetricsTable } from "../../components/participation/MetricsTable";
import {
  ParticipationEmpty,
  ParticipationKpi,
} from "../../components/participation/ParticipationKpi";
import { ConfidencePill, StatusPill } from "../../components/participation/Tags";
import { useFilters } from "../../context/FilterContext";
import {
  useLevelRows,
  useNationalSummary,
  usePollingUnitRows,
} from "../../hooks/api/useParticipation";
import { formatCount, formatPercent, formatRelative } from "../../lib/participation";

const FEED_SIZE = 15;
const TICK_MS = 20_000;

/** A drilled-into unit: its ID fetches the next level, its name labels it. */
interface Picked {
  id: string;
  name: string;
}

/** Reporting velocity rather than results — how much of the country is in yet. */
export default function Live() {
  const { rootUnits } = useFilters();
  const [state, setState] = useState<Picked | null>(null);
  const [lga, setLga] = useState<Picked | null>(null);
  const [tick, setTick] = useState(() => Date.now());

  // Queries refetch on their own; the clock still has to move so the
  // relative timestamps in the feed stay honest between refreshes.
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const national = useNationalSummary();
  const statesQuery = useLevelRows(rootUnits[0]?.id);
  const lgasQuery = useLevelRows(state?.id, { state: state?.name });
  const wardsQuery = useLevelRows(lga?.id, { state: state?.name, lga: lga?.name });
  const { rows } = usePollingUnitRows();

  const summary = national.summary;
  const states = statesQuery.rows;
  const lgas = lgasQuery.rows;
  const wards = wardsQuery.rows;

  const feed = useMemo(
    () =>
      rows
        .filter((r) => r.report)
        .sort((a, b) => b.report!.received_at.localeCompare(a.report!.received_at))
        .slice(0, FEED_SIZE),
    [rows],
  );

  const lastHour = feed.filter(
    (r) => tick - new Date(r.report!.received_at).getTime() < 3_600_000,
  ).length;

  return (
    <ParticipationShell
      title="Live Turnout Monitor"
      subtitle="Reporting velocity and coverage progress, refreshed automatically"
      actions={
        <span className="flex items-center gap-1.5 rounded-lg border border-success/40 bg-success/10 px-2 py-1 text-[11px] font-semibold text-success">
          <Radio className="h-3 w-3 animate-ticker" /> Live · {formatRelative(new Date(tick).toISOString())}
        </span>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ParticipationKpi
          label="PUs reporting"
          value={`${formatCount(summary?.coveredPus)} / ${formatCount(summary?.totalPus)}`}
          provenance="sentinel_observed"
        />
        <ParticipationKpi
          label="Voter coverage"
          value={formatPercent(summary?.metrics.voterCoverage)}
          provenance="sentinel_observed"
        />
        <ParticipationKpi
          label="Observed turnout"
          value={formatPercent(summary?.metrics.participationRate)}
          provenance="sentinel_observed"
        />
        <ParticipationKpi
          label="Reports in last hour"
          value={formatCount(lastHour)}
          hint={`${formatCount(summary?.verifiedReports)} verified so far`}
        />
      </div>

      <Panel
        title="Live state board"
        action={summary && <ConfidencePill value={summary.confidence} />}
      >
        {statesQuery.isLoading ? (
          <LoadingRows rows={3} padded={false} />
        ) : statesQuery.error ? (
          <ErrorState error={statesQuery.error} onRetry={() => statesQuery.refetch()} />
        ) : states.length ? (
          <MetricsTable
            rows={states}
            levelLabel="State"
            selected={state?.id ?? null}
            onSelect={(row) => {
              setState({ id: row.key, name: row.label });
              setLga(null);
            }}
          />
        ) : (
          <ParticipationEmpty message="No live data yet." />
        )}
      </Panel>

      {state && (
        <Panel title={`LGAs — ${state.name}`}>
          {lgasQuery.isLoading ? (
            <LoadingRows rows={2} padded={false} />
          ) : lgas.length ? (
            <MetricsTable
              rows={lgas}
              levelLabel="LGA"
              selected={lga?.id ?? null}
              onSelect={(row) => setLga({ id: row.key, name: row.label })}
            />
          ) : (
            <ParticipationEmpty message="No LGA data." />
          )}
        </Panel>
      )}

      {state && lga && (
        <Panel title={`Wards — ${lga.name}`}>
          {wardsQuery.isLoading ? (
            <LoadingRows rows={2} padded={false} />
          ) : wards.length ? (
            <MetricsTable rows={wards} levelLabel="Ward" />
          ) : (
            <ParticipationEmpty message="No ward data." />
          )}
        </Panel>
      )}

      <Panel title="Latest polling-unit submissions">
        {feed.length === 0 ? (
          <ParticipationEmpty message="No submissions received yet." />
        ) : (
          <ul className="space-y-2">
            {feed.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 p-2 text-xs"
              >
                <span className="font-semibold">{row.code}</span>
                <span className="text-[11px] text-muted-foreground">
                  {[row.ward, row.lga, row.state].filter(Boolean).join(" · ")}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  A {formatCount(row.report?.participation?.accredited_persons)} · P{" "}
                  {formatCount(row.report?.participation?.participating_persons)} · R{" "}
                  {formatCount(row.registered)}
                </span>
                <StatusPill
                  value={row.report?.review_state}
                  tone={
                    row.report?.review_state === "verified"
                      ? "primary"
                      : row.report?.review_state === "rejected" ||
                          row.report?.review_state === "revoked"
                        ? "destructive"
                        : "warning"
                  }
                />
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {formatRelative(row.report?.received_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </ParticipationShell>
  );
}
