import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock, ClipboardList, Flame, MapPin, Plus, Rss, User } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Badge, type BadgeTone } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { StateHeatmap } from "../components/charts/StateHeatmap";
import {
  REPORT_TYPES,
  type Priority,
  type ReportType,
  type TaskCategory,
  type TaskStatus,
} from "../lib/data";
import { useScopedData } from "../hooks/useScopedData";
import { NewTaskModal } from "../components/NewTaskModal";
import { useTasks } from "../context/TasksContext";
import { cn } from "../lib/cn";

const PRIORITY_TONE: Record<Priority, BadgeTone> = {
  High: "destructive",
  Medium: "warning",
  Low: "info",
};

const STATUS_TONE: Record<TaskStatus, BadgeTone> = {
  Pending: "muted",
  "In Progress": "primary",
  Completed: "success",
};

/** Clicking a task advances it around this cycle. */
const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  Pending: "In Progress",
  "In Progress": "Completed",
  Completed: "Pending",
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

export default function Operations() {
  // The full roster is held locally so status edits survive a filter change;
  // the geographic filter is applied at render time.
  const { tasks, setStatus } = useTasks();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All types");
  const [taskOpen, setTaskOpen] = useState(false);
  const { inScope, inCampaign, fieldReports, states, scopeLabel } = useScopedData();

  // Tasks belong to a campaign and to a place, so both filters apply.
  const visibleTasks = tasks.filter((t) => inCampaign(t.campaignId) && inScope(t.state));

  const visibleReports =
    filter === "All types" ? fieldReports : fieldReports.filter((r) => r.type === filter);

  const activeCount = visibleTasks.filter((t) => t.status !== "Completed").length;

  function advance(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const next = NEXT_STATUS[task.status];
    setStatus(id, next);
    toast.success(`"${task.title.slice(0, 34)}…" → ${next}`);
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
              onClick={() => toast.info("Report composer is not wired to an API yet.")}
            >
              <ClipboardList className="h-4 w-4" />
              Submit Report
            </Button>
            <Button variant="primary" onClick={() => setTaskOpen(true)}>
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
          <ul className="divide-y divide-border">
            {visibleTasks.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => advance(t.id)}
                  className="w-full cursor-pointer px-4 py-3.5 text-left transition-colors hover:bg-secondary/40 sm:px-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p
                      className={cn(
                        "text-[13px] font-medium leading-snug",
                        t.status === "Completed" && "text-muted-foreground line-through",
                      )}
                    >
                      {t.title}
                    </p>
                    <Badge tone={PRIORITY_TONE[t.priority]} className="shrink-0">
                      {t.priority}
                    </Badge>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone={CATEGORY_TONE[t.category]}>{t.category}</Badge>
                    <span className="text-[11px] text-muted-foreground">{t.subject}</span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {t.assignee}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {t.state} · {t.lga}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {t.due}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1.5">
                      <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                      <span className="hidden text-[10px] sm:inline">click to advance</span>
                    </span>
                  </div>
                </button>
              </li>
            ))}
            {visibleTasks.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                No tasks for this campaign in {scopeLabel}.
              </li>
            )}
          </ul>
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

          <ol className="divide-y divide-border">
            {visibleReports.map((r) => (
              <li key={r.id} className="px-4 py-3.5 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <Badge tone={TYPE_TONE[r.type]}>{r.type}</Badge>
                  <span className="font-mono text-[10px] text-muted-foreground">{r.time}</span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed">{r.body}</p>
                <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                  {r.agent} · {r.location}
                </p>
              </li>
            ))}
            {visibleReports.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                No {filter.toLowerCase()} reports in this window.
              </li>
            )}
          </ol>
        </Panel>
      </div>

      <Panel
        title="Field Activity Heatmap"
        subtitle={`Density across ${scopeLabel}`}
        icon={<Flame className="h-4 w-4" />}
      >
        <StateHeatmap states={states} showReports />
      </Panel>

      <NewTaskModal
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        onCreate={(task) => {
          toast.success(`${task.category} assigned to ${task.assignee} — due ${task.due}.`);
        }}
      />
    </>
  );
}
