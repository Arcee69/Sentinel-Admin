import { cn } from "../../lib/cn";
import { formatCount, formatPercent, type LevelSummary } from "../../lib/participation";
import { ConfidencePill, DeltaValue } from "./Tags";

interface Props {
  rows: LevelSummary[];
  /** What one row is — "State", "LGA", "Ward", "Polling Unit". */
  levelLabel: string;
  onSelect?: (row: LevelSummary) => void;
  selected?: string | null;
}

/**
 * The drill-down table, shared by every geography level. Register and
 * observation sit in adjacent columns on purpose: coverage is the column that
 * tells you how much of the turnout figure to believe.
 */
export function MetricsTable({ rows, levelLabel, onSelect, selected }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px] text-xs">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="py-2 pr-3 font-medium">{levelLabel}</th>
            <th className="py-2 pr-3 text-right font-medium">Registered (INEC)</th>
            <th className="py-2 pr-3 text-right font-medium">Covered voters</th>
            <th className="py-2 pr-3 text-right font-medium">Voter coverage</th>
            <th className="py-2 pr-3 text-right font-medium">Participating</th>
            <th className="py-2 pr-3 text-right font-medium">Observed turnout</th>
            <th className="py-2 pr-3 text-right font-medium">Historical</th>
            <th className="py-2 pr-3 text-right font-medium">Difference</th>
            <th className="py-2 pr-3 font-medium">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.key}
              onClick={() => onSelect?.(r)}
              className={cn(
                "border-b border-border/50 last:border-0",
                onSelect && "cursor-pointer transition-colors hover:bg-secondary/30",
                selected === r.key && "bg-primary/10",
              )}
            >
              <td className="py-2 pr-3 font-semibold">{r.label}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{formatCount(r.registered)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {formatCount(r.coveredRegistered)}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {formatPercent(r.metrics.voterCoverage)}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">{formatCount(r.participating)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {formatPercent(r.metrics.participationRate)}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {formatPercent(r.historicalTurnout)}
              </td>
              <td className="py-2 pr-3 text-right">
                <DeltaValue value={r.historicalDelta} />
              </td>
              <td className="py-2 pr-3">
                <ConfidencePill value={r.confidence} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
