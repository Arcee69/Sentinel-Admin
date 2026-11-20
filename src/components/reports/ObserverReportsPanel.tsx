import { useState } from "react";
import { Eye, Paperclip } from "lucide-react";
import { Panel } from "../ui/Panel";
import { Badge } from "../ui/Badge";
import { Pager } from "../ui/Pager";
import { SegmentedControl } from "../ui/SegmentedControl";
import { EmptyState, ErrorState, LoadingRows } from "../ui/AsyncState";
import { ObserverReportDialog } from "./ObserverReportDialog";
import { useObserverReports } from "../../hooks/api/useReports";
import { formatDateTime, humanize } from "../../lib/format";
import { observerStatus } from "../../lib/reports";
import { cn } from "../../lib/cn";
import type { ObserverReport, ObserverReportsQuery } from "../../services/reports";

const STATUS_FILTERS = ["All", "In review", "Reviewed"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_PARAM: Record<StatusFilter, ObserverReportsQuery["status"]> = {
  All: undefined,
  "In review": "in_review",
  Reviewed: "reviewed",
};

/**
 * Reports observers filed from the field app. Paged on the server — one
 * request per page shown — and narrowed to the topbar state when one is set.
 */
export function ObserverReportsPanel({
  campaignId,
  stateId,
  scopeLabel,
}: {
  campaignId: string | undefined;
  stateId: string | undefined;
  scopeLabel: string;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  // The page belongs to one filter combination; changing either starts at page 1.
  const filterKey = `${statusFilter}|${stateId ?? ""}`;
  const [paging, setPaging] = useState({ key: filterKey, page: 0 });
  const page = paging.key === filterKey ? paging.page : 0;
  const [open, setOpen] = useState<ObserverReport | null>(null);

  const query = useObserverReports(campaignId, {
    page: page + 1,
    status: STATUS_PARAM[statusFilter],
    stateId,
  });
  const rows = query.data?.data ?? [];
  const pageCount = Math.max(1, Number(query.data?.meta.last_page ?? 1));
  const total = query.data?.meta.total;

  return (
    <Panel
      title={total != null ? `Observer Reports (${total.toLocaleString()})` : "Observer Reports"}
      subtitle={`Filed by observers in the field · ${scopeLabel}`}
      icon={<Eye className="h-4 w-4" />}
      bodyClassName="p-0 sm:p-0"
      action={
        <SegmentedControl
          size="sm"
          options={STATUS_FILTERS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      }
    >
      {query.isLoading ? (
        <LoadingRows rows={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Eye className="h-5 w-5" />}
          title="No observer reports"
          detail={
            statusFilter === "All"
              ? "Reports observers submit from the field app will appear here."
              : `No reports are ${statusFilter.toLowerCase()} right now.`
          }
        />
      ) : (
        <>
          <div className={cn("overflow-x-auto", query.isPlaceholderData && "opacity-60")}>
            <table className="w-full min-w-180 text-left text-[12px]">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Observed</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Location</th>
                  <th className="px-3 py-2 font-medium">Details</th>
                  <th className="px-3 py-2 text-right font-medium">Evidence</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const status = observerStatus(r.status);
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setOpen(r)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setOpen(r);
                        }
                      }}
                      tabIndex={0}
                      className="cursor-pointer transition-colors hover:bg-secondary/40 focus-visible:bg-secondary/40 focus-visible:outline-none"
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                        {formatDateTime(r.observed_at ?? r.submitted_at)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {r.category_label || humanize(r.category)}
                      </td>
                      <td className="max-w-56 truncate px-3 py-2.5" title={r.location ?? undefined}>
                        {r.location || "—"}
                      </td>
                      <td
                        className="max-w-72 truncate px-3 py-2.5 text-muted-foreground"
                        title={r.details ?? undefined}
                      >
                        {r.details || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                        {r.media.length > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <Paperclip className="h-3 w-3 text-muted-foreground" />
                            {r.media.length}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={status.tone} dot>
                          {status.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <Pager
              page={page}
              pageCount={pageCount}
              onPage={(next) => setPaging({ key: filterKey, page: next })}
              className="px-4 py-2.5"
            />
          )}
        </>
      )}

      <ObserverReportDialog report={open} onClose={() => setOpen(null)} />
    </Panel>
  );
}
