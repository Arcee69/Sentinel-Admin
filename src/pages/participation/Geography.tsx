import { useMemo, useState } from "react";
import { Panel } from "../../components/ui/Panel";
import { ParticipationShell } from "../../components/participation/ParticipationShell";
import { MetricsTable } from "../../components/participation/MetricsTable";
import {
  ParticipationEmpty,
  ParticipationKpi,
} from "../../components/participation/ParticipationKpi";
import { useParticipation } from "../../context/ParticipationContext";
import { cn } from "../../lib/cn";
import {
  formatCount,
  formatPercent,
  lgaRows,
  pollingUnitRows,
  stateRows,
  wardRows,
} from "../../lib/participation";

/**
 * Nigeria → state → LGA → ward. Each tier is the same aggregation over a
 * narrower set of polling units, so a ward figure and the national figure can
 * never disagree about what "turnout" means.
 */
export default function Geography() {
  const { data } = useParticipation();
  const [state, setState] = useState<string | null>(null);
  const [lga, setLga] = useState<string | null>(null);

  const states = useMemo(() => stateRows(data), [data]);
  const lgas = useMemo(() => (state ? lgaRows(data, state) : []), [data, state]);
  const wards = useMemo(
    () => (state && lga ? wardRows(data, state, lga) : []),
    [data, state, lga],
  );
  const inView = useMemo(
    () => pollingUnitRows(data, { state: state ?? undefined, lga: lga ?? undefined }),
    [data, state, lga],
  );

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
              {state}
            </button>
          </>
        )}
        {lga && (
          <>
            <span className="text-muted-foreground">›</span>
            <span className="rounded-lg border border-primary/40 bg-primary/10 px-2 py-1 font-semibold text-primary">
              {lga}
            </span>
          </>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ParticipationKpi label="Polling units in view" value={formatCount(inView.length)} />
        <ParticipationKpi
          label="Reporting"
          value={formatCount(inView.filter((r) => r.report).length)}
          provenance="sentinel_observed"
        />
        <ParticipationKpi
          label="Register loaded"
          value={formatPercent(
            inView.length
              ? (inView.filter((r) => r.registered != null).length / inView.length) * 100
              : null,
          )}
          provenance="inec_official"
        />
      </div>

      <Panel title="States">
        {states.length ? (
          <MetricsTable
            rows={states}
            levelLabel="State"
            selected={state ? (states.find((r) => r.state === state)?.key ?? null) : null}
            onSelect={(row) => {
              setState(row.state ?? row.label);
              setLga(null);
            }}
          />
        ) : (
          <ParticipationEmpty message="No polling units loaded." />
        )}
      </Panel>

      {state && (
        <Panel title={`LGAs — ${state}`}>
          {lgas.length ? (
            <MetricsTable
              rows={lgas}
              levelLabel="LGA"
              selected={lga ? (lgas.find((r) => r.lga === lga)?.key ?? null) : null}
              onSelect={(row) => setLga(row.lga ?? row.label)}
            />
          ) : (
            <ParticipationEmpty message={`No polling units recorded in ${state}.`} />
          )}
        </Panel>
      )}

      {state && lga && (
        <Panel title={`Wards — ${lga}, ${state}`}>
          {wards.length ? (
            <MetricsTable rows={wards} levelLabel="Ward" />
          ) : (
            <ParticipationEmpty message="No wards recorded for this LGA." />
          )}
        </Panel>
      )}
    </ParticipationShell>
  );
}
