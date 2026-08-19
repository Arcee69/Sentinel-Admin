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
import { NG_STATE_SHAPES, NG_VIEWBOX } from "../../lib/nigeriaGeo";
import { STATE_ACTIVITY } from "../../lib/states";
import {
  formatCount,
  formatPercent,
  lgaRows,
  MAP_LAYERS,
  nationalSummary,
  stateRows,
  type LevelSummary,
  type MapLayer,
} from "../../lib/participation";

/** Geometry is keyed by state code; participation rows are keyed by name. */
const NAME_BY_CODE = new Map(STATE_ACTIVITY.map((s) => [s.code, s.name]));

/** The figure a layer shades by. `null` means no data — never zero. */
function layerValue(row: LevelSummary | undefined, layer: MapLayer): number | null {
  if (!row) return null;
  switch (layer) {
    case "registered":
      return row.registered || null;
    case "coverage":
      return row.metrics.voterCoverage;
    case "accreditation":
      return row.metrics.accreditationRate;
    case "participation":
    case "turnout":
      return row.metrics.participationRate;
    case "historical_difference":
      return row.historicalDelta;
    case "verification": {
      const total = row.verifiedReports + row.unverifiedReports;
      return total === 0 ? null : (row.verifiedReports / total) * 100;
    }
    case "anomaly":
      return row.anomalies || null;
  }
}

function formatLayer(layer: MapLayer, value: number | null): string {
  if (value == null) return "no data";
  if (layer === "registered" || layer === "anomaly") return formatCount(value);
  if (layer === "historical_difference") {
    return `${value > 0 ? "+" : ""}${value.toFixed(2)} pp`;
  }
  return formatPercent(value);
}

/**
 * Choropleth over the state outlines.
 *
 * Absence of data is its own shade. A state nobody has reported from must not
 * look like a state with zero turnout — that distinction is the whole reason
 * this view exists rather than a plain table.
 */
function Choropleth({
  states,
  layer,
  onLayerChange,
  onSelect,
}: {
  states: LevelSummary[];
  layer: MapLayer;
  onLayerChange: (layer: MapLayer) => void;
  onSelect: (state: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const byName = useMemo(() => {
    const map = new Map<string, LevelSummary>();
    for (const row of states) map.set((row.state ?? row.label).toLowerCase(), row);
    return map;
  }, [states]);

  const rowFor = (code: string) => {
    const name = NAME_BY_CODE.get(code);
    return name ? byName.get(name.toLowerCase()) : undefined;
  };

  const values = NG_STATE_SHAPES.map((s) => layerValue(rowFor(s.id), layer)).filter(
    (v): v is number => v != null,
  );
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;

  const fill = (value: number | null) => {
    if (value == null) return "var(--color-muted)";
    if (layer === "anomaly") {
      return `oklch(0.55 0.19 25 / ${0.25 + 0.65 * (max ? value / max : 0)})`;
    }
    if (layer === "historical_difference") {
      // Diverging: the sign is the message, so hue carries it and only
      // magnitude rides on opacity.
      const hue = value >= 0 ? 150 : 25;
      return `oklch(0.6 0.16 ${hue} / ${0.2 + 0.7 * Math.min(1, Math.abs(value) / 15)})`;
    }
    const t = max === min ? 0.6 : (value - min) / (max - min);
    return `oklch(0.62 0.15 250 / ${0.18 + 0.72 * t})`;
  };

  const hovered = hover ? rowFor(hover) : undefined;
  const hoveredName = hover ? (NAME_BY_CODE.get(hover) ?? hover) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {MAP_LAYERS.map((l) => (
          <button
            key={l.key}
            onClick={() => onLayerChange(l.key)}
            className={cn(
              "cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors",
              layer === l.key
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="relative rounded-xl border border-border bg-card/80 p-2">
        <svg
          viewBox={NG_VIEWBOX}
          className="h-auto w-full"
          role="img"
          aria-label="Nigeria turnout choropleth by state"
        >
          {NG_STATE_SHAPES.map((shape) => {
            const row = rowFor(shape.id);
            return (
              <path
                key={shape.id}
                d={shape.d}
                fill={fill(layerValue(row, layer))}
                stroke={hover === shape.id ? "oklch(0.85 0.02 250)" : "oklch(0.45 0.02 250 / 0.7)"}
                strokeWidth={hover === shape.id ? 1.6 : 0.7}
                className="cursor-pointer transition-[fill,stroke] duration-200"
                onMouseEnter={() => setHover(shape.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect(row?.state ?? NAME_BY_CODE.get(shape.id) ?? shape.id)}
              />
            );
          })}
        </svg>

        {hoveredName && (
          <div className="pointer-events-none absolute right-3 top-3 w-56 rounded-lg border border-border bg-popover/95 p-3 text-xs shadow-elevated">
            <p className="font-semibold">{hoveredName}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {MAP_LAYERS.find((l) => l.key === layer)?.label}:{" "}
              <span className="font-semibold text-foreground">
                {formatLayer(layer, layerValue(hovered, layer))}
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              Registered: {formatCount(hovered?.registered)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              PU coverage: {hovered ? `${hovered.coveredPus}/${hovered.totalPus}` : "—"}
            </p>
            {!hovered && (
              <p className="mt-1 text-[11px] text-warning">
                No polling units loaded for this state.
              </p>
            )}
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Shading uses observed Sentinel data over the INEC register baseline. States with no register
        baseline or no agent report render as “no data” — never as zero turnout.
      </p>
    </div>
  );
}

export default function TurnoutMap() {
  const { data } = useParticipation();
  const [layer, setLayer] = useState<MapLayer>("coverage");
  const [state, setState] = useState<string | null>(null);

  const summary = useMemo(() => nationalSummary(data), [data]);
  const states = useMemo(() => stateRows(data), [data]);
  const lgas = useMemo(() => (state ? lgaRows(data, state) : []), [data, state]);

  return (
    <ParticipationShell
      title="Turnout Map"
      subtitle="Layered geographic view — data-free areas are shown as no data, never as zero"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ParticipationKpi
          label="Registered voters"
          value={formatCount(summary.registered)}
          provenance="inec_official"
        />
        <ParticipationKpi
          label="Voter coverage"
          value={formatPercent(summary.metrics.voterCoverage)}
          provenance="sentinel_observed"
        />
        <ParticipationKpi
          label="States with data"
          value={formatCount(states.filter((s) => s.coveredPus > 0).length)}
        />
        <ParticipationKpi
          label="Anomalies"
          value={formatCount(summary.anomalies)}
          tone={summary.anomalies ? "danger" : "default"}
        />
      </div>

      <Panel title="Nigeria">
        {states.length === 0 ? (
          <ParticipationEmpty message="No polling units loaded — the map has nothing to shade yet." />
        ) : (
          <Choropleth
            states={states}
            layer={layer}
            onLayerChange={setLayer}
            onSelect={setState}
          />
        )}
      </Panel>

      {state && (
        <Panel title={`LGA breakdown — ${state}`}>
          {lgas.length ? (
            <MetricsTable rows={lgas} levelLabel="LGA" />
          ) : (
            <ParticipationEmpty message={`No polling units recorded in ${state}.`} />
          )}
        </Panel>
      )}
    </ParticipationShell>
  );
}
