import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Input, Label, Select } from "../../components/ui/Field";
import { ParticipationShell } from "../../components/participation/ParticipationShell";
import {
  ParticipationEmpty,
  ParticipationKpi,
} from "../../components/participation/ParticipationKpi";
import { DeltaValue } from "../../components/participation/Tags";
import { useParticipation } from "../../context/ParticipationContext";
import {
  benchmark,
  canVerify,
  formatPercent,
  geoKey,
  HISTORICAL_YEARS,
  indexHistorical,
  nationalSummary,
  stateRows,
} from "../../lib/participation";

const BLANK = { election_year: "2023", level: "national", state: "", turnout: "" };

/**
 * Official past results against the current observation.
 *
 * The historical rows are INEC official and stay labelled as such wherever they
 * sit beside a Sentinel figure — the comparison is the point, but conflating
 * the two would not be.
 */
export default function Historical() {
  const { data, role, addHistorical } = useParticipation();
  const [form, setForm] = useState(BLANK);

  const mayRecord = canVerify(role);

  const index = useMemo(() => indexHistorical(data.historical), [data]);
  const summary = useMemo(() => nationalSummary(data), [data]);
  const states = useMemo(() => stateRows(data), [data]);
  const national = benchmark(index, "national");

  const record = () => {
    const turnout = Number(form.turnout);
    if (!Number.isFinite(turnout)) {
      toast.error("Turnout must be a number");
      return;
    }
    addHistorical({
      level: form.level as "national" | "state",
      state: form.level === "state" ? form.state.trim() : undefined,
      election_year: Number(form.election_year),
      turnout_percentage: turnout,
    });
    toast.success("Historical figure recorded");
    setForm((f) => ({ ...f, turnout: "" }));
  };

  return (
    <ParticipationShell
      title="Historical Comparison"
      subtitle="2015 · 2019 · 2023 official turnout against 2027 Sentinel observation"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {HISTORICAL_YEARS.map((year) => (
          <ParticipationKpi
            key={year}
            label={`${year} national turnout`}
            value={formatPercent(national.years[year] ?? null)}
            provenance="inec_official"
          />
        ))}
        <ParticipationKpi
          label="2027 observed turnout"
          value={formatPercent(summary.metrics.participationRate)}
          provenance="sentinel_observed"
          hint={`${formatPercent(summary.metrics.voterCoverage)} coverage`}
        />
        <ParticipationKpi
          label="Historical average"
          value={formatPercent(national.average)}
          provenance="inec_official"
        />
      </div>

      <Panel title="State comparison">
        {states.length === 0 ? (
          <ParticipationEmpty message="No 2027 observations yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-xs">
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
                  const hist = benchmark(index, geoKey(s.state));
                  return (
                    <tr key={s.key} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-3 font-semibold">{s.label}</td>
                      {HISTORICAL_YEARS.map((y) => (
                        <td key={y} className="py-2 pr-3 text-right tabular-nums">
                          {formatPercent(hist.years[y] ?? null)}
                        </td>
                      ))}
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatPercent(hist.average)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatPercent(s.metrics.participationRate)}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <DeltaValue value={s.historicalDelta} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {mayRecord && (
        <Panel title="Record an official historical figure">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-[11px]">Year</Label>
              <Input
                value={form.election_year}
                onChange={(e) => setForm((f) => ({ ...f, election_year: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Level</Label>
              <Select
                className="w-full"
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
              >
                <option value="national">National</option>
                <option value="state">State</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">State</Label>
              <Input
                disabled={form.level !== "state"}
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Turnout %</Label>
              <Input
                value={form.turnout}
                onChange={(e) => setForm((f) => ({ ...f, turnout: e.target.value }))}
              />
            </div>
          </div>
          <Button
            className="mt-3"
            size="sm"
            variant="outline"
            disabled={!form.turnout || (form.level === "state" && !form.state.trim())}
            onClick={record}
          >
            Record figure
          </Button>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Historical rows are INEC official results and are labelled as such wherever they are
            compared with Sentinel observation.
          </p>
        </Panel>
      )}
    </ParticipationShell>
  );
}
