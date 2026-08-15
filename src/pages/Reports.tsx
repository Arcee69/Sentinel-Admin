import { useState } from "react";
import { toast } from "sonner";
import { BarChart3, Download, FileDown, LineChart, Table2 } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { TrendChart, type TrendSeries } from "../components/charts/TrendChart";
import { SparkArea } from "../components/charts/SparkArea";
import { ENGAGEMENT_TRENDS, SENTIMENT_TREND } from "../lib/data";
import { useScopedData } from "../hooks/useScopedData";

const weeks = ENGAGEMENT_TRENDS.map((d) => d.week);

const SERIES: TrendSeries[] = [
  {
    key: "reach",
    label: "Reach",
    unit: "people",
    color: "var(--color-chart-1)",
    values: ENGAGEMENT_TRENDS.map((d) => d.reach),
    format: (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}M` : `${n}k`),
  },
  {
    key: "engagement",
    label: "Engagement",
    unit: "percent",
    color: "var(--color-chart-2)",
    values: ENGAGEMENT_TRENDS.map((d) => d.engagement),
    format: (n) => `${n}%`,
  },
  {
    key: "shares",
    label: "Shares",
    unit: "count",
    color: "var(--color-chart-3)",
    values: ENGAGEMENT_TRENDS.map((d) => d.shares),
    format: (n) => n.toLocaleString(),
  },
];

export default function Reports() {
  const [showTable, setShowTable] = useState(false);
  const { states, scopeLabel } = useScopedData();

  const topStates = [...states].sort((a, b) => b.reports - a.reports).slice(0, 8);
  const maxReports = Math.max(1, ...topStates.map((s) => s.reports));

  const notWired = (what: string) => () =>
    toast.info(`${what} export is not wired to an API yet.`);

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        subtitle={`Trends, performance & exports · ${scopeLabel}`}
        actions={
          <>
            <Button variant="outline" onClick={notWired("PDF")}>
              <FileDown className="h-4 w-4" />
              Export PDF
            </Button>
            <Button variant="outline" onClick={notWired("CSV")}>
              <Table2 className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="primary" onClick={notWired("Bundle")}>
              <Download className="h-4 w-4" />
              Download All
            </Button>
          </>
        }
      />

      <Panel
        title="Engagement Trends"
        subtitle="Reach · Engagement · Shares (12 weeks)"
        icon={<LineChart className="h-4 w-4" />}
        action={
          <button
            onClick={() => setShowTable((v) => !v)}
            className="cursor-pointer text-[11px] text-primary hover:underline"
          >
            {showTable ? "Hide table" : "View as table"}
          </button>
        }
      >
        <TrendChart labels={weeks} series={SERIES} />

        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Each measure keeps its own panel and scale — reach, engagement rate and shares
          are not comparable on a shared axis. Hover to read the same week across all three.
        </p>

        {showTable && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[520px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Week</th>
                  <th className="px-3 py-2 text-right font-medium">Reach</th>
                  <th className="px-3 py-2 text-right font-medium">Engagement</th>
                  <th className="px-3 py-2 text-right font-medium">Shares</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono tabular-nums">
                {ENGAGEMENT_TRENDS.map((d) => (
                  <tr key={d.week}>
                    <td className="px-3 py-1.5">{d.week}</td>
                    <td className="px-3 py-1.5 text-right">{d.reach.toLocaleString()}k</td>
                    <td className="px-3 py-1.5 text-right">{d.engagement}%</td>
                    <td className="px-3 py-1.5 text-right">{d.shares.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Panel
          title="Sentiment Trend"
          subtitle="14-day window · net positive score"
          icon={<LineChart className="h-4 w-4" />}
          action={<Badge tone="success">+11 vs. D1</Badge>}
        >
          <SparkArea
            labels={SENTIMENT_TREND.map((d) => d.day)}
            values={SENTIMENT_TREND.map((d) => d.score)}
            color="var(--color-chart-2)"
          />
        </Panel>

        <Panel
          title="Field Activity by State"
          subtitle="Top 8 reporting states today"
          icon={<BarChart3 className="h-4 w-4" />}
        >
          {/* Ranked magnitude → horizontal bars, sorted descending,
              each bar direct-labelled with its value. */}
          <ul className="space-y-2.5">
            {topStates.map((s) => (
              <li key={s.code} className="flex items-center gap-3">
                <span className="w-24 shrink-0 truncate text-[12px]">{s.name}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted/40">
                  <div
                    className="flex h-full items-center justify-end rounded-md px-2"
                    style={{
                      width: `${(s.reports / maxReports) * 100}%`,
                      background: "var(--color-chart-1)",
                    }}
                  >
                    <span className="font-mono text-[10px] font-semibold tabular-nums">
                      {s.reports}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Reports submitted today, all channels.
          </p>
        </Panel>
      </div>
    </>
  );
}
