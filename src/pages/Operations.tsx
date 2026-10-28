import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  ClipboardList,
  Flame,
  Loader2,
  MapPin,
  Plus,
  Rss,
  User,
  XCircle,
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Badge, type BadgeTone } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { ErrorState, LoadingRows } from "../components/ui/AsyncState";
import { StateHeatmap } from "../components/charts/StateHeatmap";
import { REPORT_TYPES, type Priority, type ReportType, type TaskCategory } from "../lib/data";
import { NewTaskModal } from "../components/NewTaskModal";
import { FieldReportDialog } from "../components/FieldReportDialog";
import { useFilters } from "../context/FilterContext";
import { useAuth } from "../context/AuthContext";
import { useCancelTask, useFieldReports, useTasksQuery } from "../hooks/api/useOperations";
import { useCampaignAnalytics } from "../hooks/api/useDashboard";
import { usePeopleDirectory } from "../hooks/api/usePeople";
import { useInScope, useUnitNames } from "../hooks/useUnitNames";
import { useNow } from "../hooks/useNow";
import {
  CATEGORY_LABEL,
  METHOD_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  formatDue,
  subjectLabel,
  type BoardStatus,
} from "../lib/tasks";
import { humanize, isoDay, relativeTime } from "../lib/format";
import { toStateActivity } from "../lib/stateShapes";
import { errorMessage, toApiError } from "../services/errors";
import type { ApiFieldReport, ApiTask } from "../services/operations";
import { cn } from "../lib/cn";

const PRIORITY_TONE: Record<Priority, BadgeTone> = {
  High: "destructive",
  Medium: "warning",
  Low: "info",
};

const STATUS_TONE: Record<BoardStatus, BadgeTone> = {
  Pending: "muted",
  "In Progress": "primary",
  Completed: "success",
  Cancelled: "muted",
};

const TYPE_TONE: Record<ReportType, BadgeTone> = {
  Rally: "primary",
  "Door-to-Door": "accent",
  "Town Hall": "info",
  Media: "warning",
  Distribution: "success",
};

const FILTERS = ["All types", ...REPORT_TYPES] as const;

const CATEGORY_TONE: Record<TaskCategory, BadgeTone> = {
  "Opinion Poll": "primary",
  "Election Report": "accent",
  "Incident Report": "destructive",
};

/** Window for the field activity heatmap. */
const HEATMAP_DAYS = 30;

/** Only work that hasn't finished can be cancelled. */
function isCancellable(t: ApiTask) {
  return t.status === "open" || t.status === "in_progress";
}

export default function Operations() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All types");
  const [taskOpen, setTaskOpen] = useState(false);
  const [cancelling, setCancelling] = useState<ApiTask | null>(null);
  const [viewing, setViewing] = useState<ApiFieldReport | null>(null);

  const { apiCampaign, scopeLabel, scopeUnit } = useFilters();
  const { access } = useAuth();
  const campaignId = apiCampaign?.id;
  const canManage = !!access?.can_manage;
  const inScope = useInScope();
  const unitName = useUnitNames();
  const personName = usePeopleDirectory();
  const now = useNow();

  const tasksQuery = useTasksQuery(campaignId);
  const reportsQuery = useFieldReports(campaignId);
  const cancelTask = useCancelTask(campaignId);

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - (HEATMAP_DAYS - 1));
    return { from: isoDay(from), to: isoDay(to) };
  }, []);
  const analytics = useCampaignAnalytics(campaignId, range);

  const visibleTasks = (tasksQuery.data ?? []).filter((t) => inScope(t.geographic_unit_id));

  const scopedReports = (reportsQuery.data ?? [])
    .filter((r) => inScope(r.geographic_unit_id))
    .sort((a, b) => b.observed_at.localeCompare(a.observed_at));
  const visibleReports =
    filter === "All types"
      ? scopedReports
      : scopedReports.filter(
          (r) => r.collection_method && METHOD_LABEL[r.collection_method] === filter,
        );

  const states = toStateActivity(analytics.data?.field_activity_by_state ?? [], {
    includeUnmapped: true,
    onlyUnitId: scopeUnit?.id,
  });

  const activeCount = visibleTasks.filter(isCancellable).length;

  function confirmCancel() {
    if (!cancelling) return;
    const task = cancelling;
    cancelTask.mutate(
      { taskId: task.id, revision: task.revision },
      {
        onSuccess: () => {
          toast.success(`"${task.title.slice(0, 34)}…" → Cancelled`);
          setCancelling(null);
        },
        onError: (err) => {
          const e = toApiError(err);
          toast.error(
            e.isConflict
              ? "This task changed since it loaded. The board has been refreshed — try again."
              : errorMessage(e),
          );
          setCancelling(null);
        },
      },
    );
  }

  return (
    <>
      <PageHeader
        title="Campaign Operations"
        subtitle={`Field execution control · ${scopeLabel}`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => toast.info("Field reports are submitted by agents from the field app.")}
            >
              <ClipboardList className="h-4 w-4" />
              Submit Report
            </Button>
            <Button variant="primary" onClick={() => setTaskOpen(true)} disabled={!canManage}>
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-[1.15fr_1fr]">
        <Panel
          title="Task Management"
          subtitle={`${activeCount} active tasks`}
          icon={<ClipboardList className="h-4 w-4" />}
          bodyClassName="p-0"
        >
          {tasksQuery.isLoading ? (
            <LoadingRows rows={4} />
          ) : tasksQuery.isError ? (
            <ErrorState error={tasksQuery.error} onRetry={() => tasksQuery.refetch()} />
          ) : (
            <ul className="divide-y divide-border">
              {visibleTasks.map((t) => {
                const status = STATUS_LABEL[t.status];
                const priority = PRIORITY_LABEL[t.priority];
                const category = t.category ? CATEGORY_LABEL[t.category] : null;
                const clickable = canManage && isCancellable(t);
                const done = t.status === "completed" || t.status === "cancelled";
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => clickable && setCancelling(t)}
                      disabled={!clickable}
                      className={cn(
                        "w-full px-4 py-3.5 text-left transition-colors sm:px-5",
                        clickable ? "cursor-pointer hover:bg-secondary/40" : "cursor-default",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className={cn(
                            "text-[13px] font-medium leading-snug",
                            done && "text-muted-foreground line-through",
                          )}
                        >
                          {t.title}
                        </p>
                        <Badge tone={PRIORITY_TONE[priority]} className="shrink-0">
                          {priority}
                        </Badge>
                      </div>

                      {(category || t.subject) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {category && <Badge tone={CATEGORY_TONE[category]}>{category}</Badge>}
                          <span className="text-[11px] text-muted-foreground">
                            {subjectLabel(t.subject)}
                          </span>
                        </div>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {personName(t.assigned_membership_id)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {unitName(t.geographic_unit_id) ?? "—"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" />
                          {formatDue(t.due_at, new Date(now))}
                        </span>
                        <span className="ml-auto inline-flex items-center gap-1.5">
                          <Badge tone={STATUS_TONE[status]}>{status}</Badge>
                          {clickable && (
                            <span className="hidden text-[10px] sm:inline">click to cancel</span>
                          )}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
              {visibleTasks.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No tasks for this campaign in {scopeLabel}.
                </li>
              )}
            </ul>
          )}
        </Panel>

        <Panel
          title="Field Reports Feed"
          subtitle="Live timeline"
          icon={<Rss className="h-4 w-4" />}
          bodyClassName="p-0"
        >
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <SegmentedControl
              options={FILTERS}
              value={filter}
              onChange={setFilter}
              size="sm"
            />
          </div>

          {reportsQuery.isLoading ? (
            <LoadingRows rows={3} />
          ) : reportsQuery.isError ? (
            <ErrorState error={reportsQuery.error} onRetry={() => reportsQuery.refetch()} />
          ) : (
            <ol className="divide-y divide-border">
              {visibleReports.map((r) => {
                const type = r.collection_method ? METHOD_LABEL[r.collection_method] : null;
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => setViewing(r)}
                      className="w-full cursor-pointer px-4 py-3.5 text-left transition-colors hover:bg-secondary/40 sm:px-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        {type ? (
                          <Badge tone={TYPE_TONE[type]}>{type}</Badge>
                        ) : (
                          <Badge tone="muted">{humanize(r.activity_type)}</Badge>
                        )}
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {relativeTime(r.observed_at, now)}
                        </span>
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed">{r.narrative}</p>
                      <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                        {[personName(r.author_membership_id), unitName(r.geographic_unit_id)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </button>
                  </li>
                );
              })}
              {visibleReports.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No {filter.toLowerCase()} reports in this window.
                </li>
              )}
            </ol>
          )}
        </Panel>
      </div>

      <Panel
        title="Field Activity Heatmap"
        subtitle={`Density across ${scopeLabel}`}
        icon={<Flame className="h-4 w-4" />}
      >
        {analytics.isLoading ? (
          <LoadingRows rows={2} padded={false} />
        ) : analytics.isError ? (
          <ErrorState error={analytics.error} onRetry={() => analytics.refetch()} />
        ) : (
          <StateHeatmap states={states} showReports />
        )}
      </Panel>

      <FieldReportDialog report={viewing} onClose={() => setViewing(null)} />

      <NewTaskModal
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        onCreate={(task) => {
          toast.success(`${task.category} assigned to ${task.assignee} — due ${task.due}.`);
        }}
      />

      <Modal
        open={!!cancelling}
        onClose={() => !cancelTask.isPending && setCancelling(null)}
        title="Cancel task?"
        description="The agent will no longer see this task as open work. This can't be undone."
        icon={<XCircle className="h-4.5 w-4.5" />}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCancelling(null)}
              disabled={cancelTask.isPending}
            >
              Keep task
            </Button>
            <Button variant="danger" onClick={confirmCancel} disabled={cancelTask.isPending}>
              {cancelTask.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Cancel task
            </Button>
          </div>
        }
      >
        <p className="text-[13px] font-medium">{cancelling?.title}</p>
        {cancelling && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {personName(cancelling.assigned_membership_id)} ·{" "}
            {STATUS_LABEL[cancelling.status]} · due {formatDue(cancelling.due_at, new Date(now))}
          </p>
        )}
      </Modal>
    </>
  );
}
