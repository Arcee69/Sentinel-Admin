import { useState } from "react";
import { Gauge, Network, PieChart, TrendingUp, Users2 } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Meter } from "../components/ui/Meter";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Select } from "../components/ui/Field";
import { LGAS_BY_STATE } from "../lib/data";
import { useScopedData } from "../hooks/useScopedData";
import { useFilters } from "../context/FilterContext";

const RANGES = ["Last 14 days", "Last 30 days", "Last 90 days"] as const;

/** Categorical hues, fixed order — never cycled, never reassigned by rank. */
const SEGMENT_COLOR = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
];

export default function Intelligence() {
  const [range, setRange] = useState<(typeof RANGES)[number]>("Last 14 days");
  const [ward, setWard] = useState("");
  const { scope, isNationwide } = useFilters();
  const {
    voterSegments,
    sentiment,
    keyIssues,
    influencers,
    scopeLabel,
  } = useScopedData();

  // The state dimension now comes from the topbar scope, so this page only
  // drills the level below it.
  const wards = isNationwide ? undefined : LGAS_BY_STATE[scope];

  return (
    <>
      <PageHeader
        title="SMHP Pulse — Intelligence"
        subtitle={`Voter intelligence, sentiment & influence mapping · ${scopeLabel}`}
      />

      {/* Filters: one row above the panels */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={range}
          onChange={(e) => setRange(e.target.value as (typeof RANGES)[number])}
          aria-label="Time range"
          className="w-40"
        >
          {RANGES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>

        <Select
          aria-label="LGA"
          disabled={!wards}
          value={ward}
          onChange={(e) => setWard(e.target.value)}
          className="w-44"
        >
          <option value="">
            {wards ? "All LGAs" : "Scope to a state for LGAs"}
          </option>
          {wards?.map((w) => (
            <option key={w}>{w}</option>
          ))}
        </Select>

        <Badge tone="primary">{scopeLabel}</Badge>

        <Badge tone="success" dot className="ml-auto">
          Pulse syncing
        </Badge>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Panel
          title="Voter Segmentation"
          subtitle="Distribution & growth trends"
          icon={<Users2 className="h-4 w-4" />}
        >
          <ul className="space-y-4">
            {voterSegments.map((s, i) => (
              <li key={s.label}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex items-center gap-2 text-[13px] font-medium">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ background: SEGMENT_COLOR[i] }}
                      aria-hidden
                    />
                    {s.label}
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      {s.share}%
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-success">
                      <TrendingUp className="h-3 w-3" />
                      {s.delta}%
                    </span>
                  </span>
                </div>
                <Meter
                  value={s.share}
                  max={40}
                  className="mt-2"
                  color={SEGMENT_COLOR[i]}
                  height="h-2"
                />
                <div className="sr-only">{`${s.label}: ${s.share} percent, up ${s.delta} percent`}</div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Sentiment Analysis"
          subtitle="Net public sentiment"
          icon={<Gauge className="h-4 w-4" />}
        >
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            <SentimentDial value={sentiment.net} />

            <ul className="w-full flex-1 space-y-3">
              {[
                { label: "Positive", value: sentiment.positive, bar: "bg-success" },
                { label: "Neutral", value: sentiment.neutral, bar: "bg-muted-foreground" },
                { label: "Negative", value: sentiment.negative, bar: "bg-destructive" },
              ].map((row) => (
                <li key={row.label}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] text-muted-foreground">{row.label}</span>
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      {row.value}%
                    </span>
                  </div>
                  <Meter value={row.value} className="mt-1.5" barClassName={row.bar} />
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.15fr]">
        <Panel
          title="Key Issues Mapping"
          subtitle="Top concerns by intensity"
          icon={<PieChart className="h-4 w-4" />}
        >
          {/* Ranked magnitude → horizontal bars, sorted, direct-labelled. */}
          <ul className="space-y-2.5">
            {keyIssues.map((issue) => (
              <li key={issue.label} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-[12px]">{issue.label}</span>
                <div className="h-5 flex-1 overflow-hidden rounded-md bg-muted/50">
                  <div
                    className="flex h-full items-center justify-end rounded-md px-2 transition-[width] duration-700"
                    style={{
                      width: `${issue.score}%`,
                      background: "var(--color-chart-1)",
                    }}
                  >
                    <span className="font-mono text-[10px] font-semibold tabular-nums text-foreground">
                      {issue.score}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Influence Mapping"
          subtitle="Key influencers per ward"
          icon={<Network className="h-4 w-4" />}
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {influencers.map((p) => (
              <li
                key={p.name}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/40 sm:px-5"
              >
                <Avatar initials={p.initials} tone={p.strength >= 88 ? "accent" : "primary"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{p.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {p.role} · {p.ward}
                  </p>
                </div>
                <div className="w-24 shrink-0 text-right">
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {p.strength}
                  </span>
                  <span className="ml-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    strength
                  </span>
                  <Meter
                    value={p.strength}
                    className="mt-1.5"
                    barClassName={p.strength >= 88 ? "bg-accent" : "bg-primary"}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

/** Radial gauge for a single headline score — the number is the message. */
function SentimentDial({ value }: { value: number }) {
  const r = 52;
  const circumference = Math.PI * r; // half circle
  const filled = (value / 100) * circumference;

  return (
    <div className="relative shrink-0">
      <svg width="150" height="88" viewBox="0 0 140 82" role="img" aria-label={`Net sentiment ${value} out of 100`}>
        <path
          d={`M 18 70 A ${r} ${r} 0 0 1 122 70`}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d={`M 18 70 A ${r} ${r} 0 0 1 122 70`}
          fill="none"
          stroke="var(--color-success)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="font-mono text-3xl font-bold leading-none tabular-nums">{value}</div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-success">
          Net Positive
        </div>
      </div>
    </div>
  );
}
