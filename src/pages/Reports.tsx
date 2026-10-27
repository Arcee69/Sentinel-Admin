import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BarChart3, Download, FileDown, LineChart, Loader2, Table2 } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { ErrorState, LoadingRows } from "../components/ui/AsyncState";
import { TrendChart, type TrendSeries } from "../components/charts/TrendChart";
import { SparkArea } from "../components/charts/SparkArea";
import { useFilters } from "../context/FilterContext";
import { useCampaignAnalytics, usePollingOccasions } from "../hooks/api/useDashboard";
import { useIntelligenceSummary } from "../hooks/api/useIntelligence";
import { useOperationsDownload, useParticipationExport } from "../hooks/api/useReports";
import { PARTICIPATION_MODE } from "../hooks/api/useParticipation";
import { dailyNetSentiment, weeklyActivity, weeklyWindow } from "../lib/reports";
import { isoDay } from "../lib/format";
import { errorMessage } from "../services/errors";
import type { OperationsFormat } from "../services/reports";

const WEEKS = 12;
const SENTIMENT_DAYS = 14;

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

export default function Reports() {
  const [showTable, setShowTable] = useState(false);
  const { apiCampaign, scopeUnit, scopeLabel } = useFilters();
  const campaignId = apiCampaign?.id;

  const windows = useMemo(() => {
    const today = isoDay(new Date());
    const sentimentFrom = new Date();
    sentimentFrom.setDate(sentimentFrom.getDate() - (SENTIMENT_DAYS - 1));
    return {
      weeks: weeklyWindow(WEEKS),
      today: { from: today, to: today },
      sentiment: { from: isoDay(sentimentFrom), to: today },
    };
  }, []);

  const analytics = useCampaignAnalytics(campaignId, windows.weeks);
  const todayAnalytics = useCampaignAnalytics(campaignId, windows.today);
  const sentimentQuery = useIntelligenceSummary(campaignId, {
    ...windows.sentiment,
    unitId: scopeUnit?.id,
  });
  const occasions = usePollingOccasions();
  const operations = useOperationsDownload(campaignId);
  const participationExport = useParticipationExport(campaignId);

  const weekly = useMemo(
    () => weeklyActivity(analytics.data, windows.weeks.from, WEEKS),
    [analytics.data, windows.weeks.from],
  );
  const series: TrendSeries[] = [
    {
      key: "reach",
      label: "Reach",
      unit: "people · declared",
      color: "var(--color-chart-1)",
      values: weekly.map((w) => w.reach),
      format: compact,
    },
    {
      key: "field",
      label: "Field reports",
      unit: "count",
      color: "var(--color-chart-2)",
      values: weekly.map((w) => w.fieldReports),
      format: (n) => n.toLocaleString(),
    },
    {
      key: "polling",
      label: "Polling reports",
      unit: "count",
      color: "var(--color-chart-3)",
      values: weekly.map((w) => w.pollingReports),
      format: (n) => n.toLocaleString(),
    },
  ];

  const sentiment = useMemo(() => dailyNetSentiment(sentimentQuery.data), [sentimentQuery.data]);
  const sentimentDelta =
    sentiment.length > 1 ? sentiment[sentiment.length - 1].score - sentiment[0].score : null;

  // "Today" honours the topbar scope: one state, or every state in the campaign.
  const topStates = (todayAnalytics.data?.field_activity_by_state ?? [])
    .filter((s) => !scopeUnit || s.geographic_unit_id === scopeUnit.id)
    .sort((a, b) => b.reports - a.reports)
    .slice(0, 8);
  const maxReports = Math.max(1, ...topStates.map((s) => s.reports));

  function downloadOperations(format: OperationsFormat) {
    operations.mutate(
      { ...windows.weeks, format },
      {
        onSuccess: () => toast.success(`Operations report downloaded (${format.toUpperCase()}).`),
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  }

  function downloadAll() {
    const occasion = occasions.data?.[0];
    if (!occasion) {
      toast.error("No published polling occasion to export yet.");
      return;
    }
    toast.info("Preparing the participation export…");
    participationExport.mutate(
      { pollingOccasionId: occasion.id, mode: PARTICIPATION_MODE },
      {
        onSuccess: (job) =>
          toast.success(`Participation export downloaded (${job.row_count ?? 0} rows).`),
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  }

  const busyFormat = operations.isPending ? operations.variables?.format : null;

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        subtitle={`Trends, performance & exports · ${scopeLabel}`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => downloadOperations("pdf")}
              disabled={operations.isPending}
            >
              {busyFormat === "pdf" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Export PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadOperations("csv")}
              disabled={operations.isPending}
            >
              {busyFormat === "csv" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Table2 className="h-4 w-4" />
              )}
              Export CSV
            </Button>
            <Button
              variant="primary"
              onClick={downloadAll}
              disabled={participationExport.isPending}
            >
              {participationExport.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download All
            </Button>
          </>
        }
      />

      <Panel
        title="Engagement Trends"
        subtitle={`Reach · Field reports · Polling reports (${WEEKS} weeks)`}
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
        {analytics.isLoading ? (
          <LoadingRows rows={3} padded={false} />
        ) : analytics.isError ? (
          <ErrorState error={analytics.error} onRetry={() => analytics.refetch()} />
        ) : (
          <TrendChart labels={weekly.map((w) => w.label)} series={series} />
        )}

        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Each measure keeps its own panel and scale — reach and report counts are not comparable
          on a shared axis. Hover to read the same week across all three. Reach is what agents
          declared and may count repeat contacts.
        </p>

        {showTable && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-130 text-left text-[12px]">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Week of</th>
                  <th className="px-3 py-2 text-right font-medium">Reach</th>
                  <th className="px-3 py-2 text-right font-medium">Field reports</th>
                  <th className="px-3 py-2 text-right font-medium">Polling reports</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono tabular-nums">
                {weekly.map((d) => (
                  <tr key={d.start}>
                    <td className="px-3 py-1.5">{d.label}</td>
                    <td className="px-3 py-1.5 text-right">{d.reach.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-right">{d.fieldReports.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-right">{d.pollingReports.toLocaleString()}</td>
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
          action={
            sentimentDelta != null ? (
              <Badge tone={sentimentDelta >= 0 ? "success" : "destructive"}>
                {sentimentDelta >= 0 ? "+" : ""}
                {sentimentDelta} vs. {sentiment[0].label}
              </Badge>
            ) : undefined
          }
        >
          {sentimentQuery.isLoading ? (
            <LoadingRows rows={2} padded={false} />
          ) : sentimentQuery.isError ? (
            <ErrorState error={sentimentQuery.error} onRetry={() => sentimentQuery.refetch()} />
          ) : sentiment.length < 2 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Not enough recorded observations in the last {SENTIMENT_DAYS} days to draw a trend.
            </p>
          ) : (
            <SparkArea
              labels={sentiment.map((d) => d.label)}
              values={sentiment.map((d) => d.score)}
              color="var(--color-chart-2)"
            />
          )}
        </Panel>

        <Panel
          title="Field Activity by State"
          subtitle="Top 8 reporting states today"
          icon={<BarChart3 className="h-4 w-4" />}
        >
          {todayAnalytics.isLoading ? (
            <LoadingRows rows={3} padded={false} />
          ) : todayAnalytics.isError ? (
            <ErrorState error={todayAnalytics.error} onRetry={() => todayAnalytics.refetch()} />
          ) : topStates.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No reports received today.
            </p>
          ) : (
            /* Ranked magnitude → horizontal bars, sorted descending,
               each bar direct-labelled with its value. */
            <ul className="space-y-2.5">
              {topStates.map((s) => (
                <li key={s.geographic_unit_id} className="flex items-center gap-3">
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
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Reports submitted today, all channels.
          </p>
        </Panel>
      </div>
    </>
  );
}
