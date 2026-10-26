import { Panel } from "../../components/ui/Panel";
import { ErrorState, LoadingRows } from "../../components/ui/AsyncState";
import { ParticipationShell } from "../../components/participation/ParticipationShell";
import {
  ParticipationEmpty,
  ParticipationKpi,
} from "../../components/participation/ParticipationKpi";
import { DeltaValue } from "../../components/participation/Tags";
import { useFilters } from "../../context/FilterContext";
import {
  useContestBenchmarks,
  useLevelRows,
  useNationalSummary,
} from "../../hooks/api/useParticipation";
import { formatPercent, HISTORICAL_YEARS } from "../../lib/participation";

/**
 * Official past results against the current observation.
 *
 * The API holds one sourced benchmark per contest (registered and cast
 * ballots, without an election year): the presidential contest's is the
 * national figure, a state contest's is that state's. Per-year turnout isn't
 * recorded, so those columns stay empty rather than guess. Benchmarks are
 * created by platform operators, so there is no entry form here.
 */
export default function Historical() {
  const { rootUnits } = useFilters();
  const national = useNationalSummary();
  const statesQuery = useLevelRows(rootUnits[0]?.id);
  const benchmarks = useContestBenchmarks();

  const summary = national.summary;
  const states = statesQuery.rows;
  const nationalBenchmark = benchmarks.national;

  return (
    <ParticipationShell
      title="Historical Comparison"
      subtitle="Official past results against the current observation"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {HISTORICAL_YEARS.map((year) => (
          <ParticipationKpi
            key={year}
            label={`${year} national turnout`}
            value={formatPercent(null)}
            provenance="inec_official"
          />
        ))}
        <ParticipationKpi
          label="2027 observed turnout"
          value={formatPercent(summary?.metrics.participationRate)}
          provenance="sentinel_observed"
          hint={`${formatPercent(summary?.metrics.voterCoverage)} coverage`}
        />
        <ParticipationKpi
          label="Historical average"
          value={formatPercent(nationalBenchmark)}
          provenance="inec_official"
          hint={nationalBenchmark == null ? "No sourced benchmark yet" : "Presidential contest benchmark"}
        />
      </div>

      <Panel title="State comparison">
        {statesQuery.isLoading || benchmarks.isLoading ? (
          <LoadingRows rows={3} padded={false} />
        ) : statesQuery.error ? (
          <ErrorState error={statesQuery.error} onRetry={() => statesQuery.refetch()} />
        ) : states.length === 0 ? (
          <ParticipationEmpty message="No 2027 observations yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-225 text-xs">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">State</th>
                  {HISTORICAL_YEARS.map((y) => (
                    <th key={y} className="py-2 pr-3 text-right font-medium">
                      {y}
                    </th>
                  ))}
                  <th className="py-2 pr-3 text-right font-medium">Average</th>
                  <th className="py-2 pr-3 text-right font-medium">2027 observed</th>
                  <th className="py-2 pr-3 text-right font-medium">Change vs latest</th>
                </tr>
              </thead>
              <tbody>
                {states.map((s) => {
                  const average = benchmarks.byState.get(s.key) ?? null;
                  const observed = s.metrics.participationRate;
                  return (
                    <tr key={s.key} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-3 font-semibold">{s.label}</td>
                      {HISTORICAL_YEARS.map((y) => (
                        <td key={y} className="py-2 pr-3 text-right tabular-nums">
                          {formatPercent(null)}
                        </td>
                      ))}
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatPercent(average)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatPercent(observed)}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <DeltaValue
                          value={
                            average != null && observed != null
                              ? +(observed - average).toFixed(2)
                              : null
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </ParticipationShell>
  );
}
