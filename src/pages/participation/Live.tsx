import { useEffect, useMemo, useState } from "react";
import { Radio } from "lucide-react";
import { Panel } from "../../components/ui/Panel";
import { ParticipationShell } from "../../components/participation/ParticipationShell";
import { MetricsTable } from "../../components/participation/MetricsTable";
import {
  ParticipationEmpty,
  ParticipationKpi,
} from "../../components/participation/ParticipationKpi";
import { ConfidencePill, StatusPill } from "../../components/participation/Tags";
import { useParticipation } from "../../context/ParticipationContext";
import {
  formatCount,
  formatPercent,
  formatRelative,
  lgaRows,
  nationalSummary,
  stateRows,
  wardRows,
} from "../../lib/participation";

const FEED_SIZE = 15;
const TICK_MS = 20_000;

/** Reporting velocity rather than results — how much of the country is in yet. */
export default function Live() {
  const { data } = useParticipation();
  const [state, setState] = useState<string | null>(null);
  const [lga, setLga] = useState<string | null>(null);
  const [tick, setTick] = useState(() => Date.now());

  // The dataset is local, so nothing refetches; the clock still has to move so
  // the relative timestamps in the feed stay honest.
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const summary = useMemo(() => nationalSummary(data), [data]);
  const states = useMemo(() => stateRows(data), [data]);
  const lgas = useMemo(() => (state ? lgaRows(data, state) : []), [data, state]);
  const wards = useMemo(
    () => (state && lga ? wardRows(data, state, lga) : []),
    [data, state, lga],
  );

  const feed = useMemo(
    () =>
      data.rows
        .filter((r) => r.report)
        .sort((a, b) => (b.report!.reported_at > a.report!.reported_at ? 1 : -1))
        .slice(0, FEED_SIZE),
    [data],
  );

  const lastHour = feed.filter(
    (r) => tick - new Date(r.report!.reported_at).getTime() < 3_600_000,
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
          value={`${formatCount(summary.coveredPus)} / ${formatCount(summary.totalPus)}`}
          provenance="sentinel_observed"
        />
        <ParticipationKpi
          label="Voter coverage"
          value={formatPercent(summary.metrics.voterCoverage)}
          provenance="sentinel_observed"
        />
        <ParticipationKpi
          label="Observed turnout"
          value={formatPercent(summary.metrics.participationRate)}
          provenance="sentinel_observed"
        />
        <ParticipationKpi
          label="Reports in last hour"
          value={formatCount(lastHour)}
          hint={`${formatCount(summary.verifiedReports)} verified so far`}
        />
      </div>

      <Panel title="Live state board" action={<ConfidencePill value={summary.confidence} />}>
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
          <ParticipationEmpty message="No live data yet." />
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
            <ParticipationEmpty message="No LGA data." />
          )}
        </Panel>
      )}

      {state && lga && (
        <Panel title={`Wards — ${lga}`}>
          {wards.length ? (
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
                <span className="font-semibold">{row.inec_pu_id}</span>
                <span className="text-[11px] text-muted-foreground">
                  {row.ward} · {row.lga} · {row.state}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  A {formatCount(row.report?.accredited_voters)} · P{" "}
                  {formatCount(row.report?.participating_voters)} · R {formatCount(row.registered)}
                </span>
                <StatusPill
                  value={row.report?.verification_status}
                  tone={
                    ["verified", "peer_reviewed"].includes(row.report?.verification_status ?? "")
                      ? "primary"
                      : "warning"
                  }
                />
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {formatRelative(row.report?.reported_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </ParticipationShell>
  );
}
