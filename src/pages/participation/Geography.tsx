import { useState } from "react";
import { Panel } from "../../components/ui/Panel";
import { ErrorState, LoadingRows } from "../../components/ui/AsyncState";
import { ParticipationShell } from "../../components/participation/ParticipationShell";
import { MetricsTable } from "../../components/participation/MetricsTable";
import {
  ParticipationEmpty,
  ParticipationKpi,
} from "../../components/participation/ParticipationKpi";
import { useFilters } from "../../context/FilterContext";
import {
  useLevelRows,
  useNationalSummary,
  useParticipationStats,
} from "../../hooks/api/useParticipation";
import { cn } from "../../lib/cn";
import { formatCount, formatPercent, type LevelSummary } from "../../lib/participation";
import { NATIONAL } from "../../lib/participationApi";

/** A drilled-into unit: its ID fetches the next level, its name labels it. */
interface Picked {
  id: string;
  name: string;
}

/**
 * Nigeria → state → LGA → ward. Each tier is the same aggregation over a
 * narrower set of polling units, so a ward figure and the national figure can
 * never disagree about what "turnout" means.
 */
export default function Geography() {
  const { rootUnits } = useFilters();
  const [state, setState] = useState<Picked | null>(null);
  const [lga, setLga] = useState<Picked | null>(null);

  const national = useNationalSummary();
  const { stats } = useParticipationStats();
  const statesQuery = useLevelRows(rootUnits[0]?.id);
  const lgasQuery = useLevelRows(state?.id, { state: state?.name });
  const wardsQuery = useLevelRows(lga?.id, { state: state?.name, lga: lga?.name });
  const states = statesQuery.rows;
  const lgas = lgasQuery.rows;
  const wards = wardsQuery.rows;

  // The level the KPIs describe: the deepest one picked, or the whole country.
  const inView: LevelSummary | null =
    (lga
      ? lgas.find((r) => r.key === lga.id)
      : state
        ? states.find((r) => r.key === state.id)
        : national.summary) ?? null;
  const placed = stats.get(lga?.id ?? state?.id ?? NATIONAL)?.entries ?? 0;

  const crumb = "rounded-lg border border-border px-2 py-1 font-semibold hover:bg-muted/40";

  return (
    <ParticipationShell
      title="State · LGA · Ward Participation"
      subtitle="Every tier uses the same metric vocabulary so figures roll up without contradiction"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          onClick={() => {
            setState(null);
            setLga(null);
          }}
          className={cn(crumb, "cursor-pointer")}
        >
          Nigeria
        </button>
        {state && (
          <>
            <span className="text-muted-foreground">›</span>
            <button onClick={() => setLga(null)} className={cn(crumb, "cursor-pointer")}>
              {state.name}
            </button>
          </>
        )}
        {lga && (
          <>
            <span className="text-muted-foreground">›</span>
            <span className="rounded-lg border border-primary/40 bg-primary/10 px-2 py-1 font-semibold text-primary">
              {lga.name}
            </span>
          </>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ParticipationKpi label="Polling units in view" value={formatCount(inView?.totalPus)} />
        <ParticipationKpi
          label="Reporting"
          value={formatCount(inView?.coveredPus)}
          provenance="sentinel_observed"
        />
        <ParticipationKpi
          label="Register loaded"
          value={formatPercent(inView?.totalPus ? (placed / inView.totalPus) * 100 : null)}
          provenance="inec_official"
        />
      </div>

      <Panel title="States">
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
          <ParticipationEmpty message="No polling units loaded." />
        )}
      </Panel>

      {state && (
        <Panel title={`LGAs — ${state.name}`}>
          {lgasQuery.isLoading ? (
            <LoadingRows rows={2} padded={false} />
          ) : lgasQuery.error ? (
            <ErrorState error={lgasQuery.error} onRetry={() => lgasQuery.refetch()} />
          ) : lgas.length ? (
            <MetricsTable
              rows={lgas}
              levelLabel="LGA"
              selected={lga?.id ?? null}
              onSelect={(row) => setLga({ id: row.key, name: row.label })}
            />
          ) : (
            <ParticipationEmpty message={`No polling units recorded in ${state.name}.`} />
          )}
        </Panel>
      )}

      {state && lga && (
        <Panel title={`Wards — ${lga.name}, ${state.name}`}>
          {wardsQuery.isLoading ? (
            <LoadingRows rows={2} padded={false} />
          ) : wardsQuery.error ? (
            <ErrorState error={wardsQuery.error} onRetry={() => wardsQuery.refetch()} />
          ) : wards.length ? (
            <MetricsTable rows={wards} levelLabel="Ward" />
          ) : (
            <ParticipationEmpty message="No wards recorded for this LGA." />
          )}
        </Panel>
      )}
    </ParticipationShell>
  );
}
