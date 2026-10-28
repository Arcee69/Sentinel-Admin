import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  Mail,
  MapPin,
  Phone,
  Plus,
  Rss,
  UserCircle,
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Badge, type BadgeTone } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import { Meter } from "../components/ui/Meter";
import { StatCard } from "../components/ui/StatCard";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { LoadingRows } from "../components/ui/AsyncState";
import { NewTaskModal } from "../components/NewTaskModal";
import { FieldReportDialog } from "../components/FieldReportDialog";
import { useFilters } from "../context/FilterContext";
import { useAuth } from "../context/AuthContext";
import { useAgentDetail } from "../hooks/api/useAgents";
import { useAgentActivity } from "../hooks/api/usePeople";
import { useUnitLineage } from "../hooks/useUnitNames";
import { useNow } from "../hooks/useNow";
import { dutyLabel, initialsOf, presenceOf } from "../lib/agents";
import {
  CATEGORY_LABEL,
  METHOD_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  formatDue,
  subjectLabel,
  type BoardStatus,
} from "../lib/tasks";
import { humanize, relativeTime } from "../lib/format";
import { errorMessage, toApiError } from "../services/errors";
import type { AgentStatus, Priority, ReportType, TaskCategory } from "../lib/data";
import type { ApiFieldReport } from "../services/operations";
import { cn } from "../lib/cn";

const STATUS_TONE: Record<AgentStatus, BadgeTone> = {
  active: "success",
  idle: "warning",
  offline: "muted",
};

const PRIORITY_TONE: Record<Priority, BadgeTone> = {
  High: "destructive",
  Medium: "warning",
  Low: "info",
};

const TASK_STATUS_TONE: Record<BoardStatus, BadgeTone> = {
  Pending: "muted",
  "In Progress": "primary",
  Completed: "success",
  Cancelled: "muted",
};

const CATEGORY_TONE: Record<TaskCategory, BadgeTone> = {
  "Opinion Poll": "primary",
  "Election Report": "accent",
  "Incident Report": "destructive",
};

const TYPE_TONE: Record<ReportType, BadgeTone> = {
  Rally: "primary",
  "Door-to-Door": "accent",
  "Town Hall": "info",
  Media: "warning",
  Distribution: "success",
};

const TASK_FILTERS = ["All", "Pending", "In Progress", "Completed"] as const;

export default function AgentDetail() {
  // The route ID is the agent's membership ID.
  const { agentId = "" } = useParams();
  const navigate = useNavigate();
  const { apiCampaign } = useFilters();
  const { access } = useAuth();
  const now = useNow();
  const [taskFilter, setTaskFilter] = useState<(typeof TASK_FILTERS)[number]>("All");
  const [assignOpen, setAssignOpen] = useState(false);
  const [viewing, setViewing] = useState<ApiFieldReport | null>(null);

  const detailQuery = useAgentDetail(apiCampaign?.id, agentId);
  const activity = useAgentActivity(apiCampaign?.id);
  const detail = detailQuery.data;

  const assignment = detail?.assignments.find((a) => a.ends_at == null) ?? detail?.assignments[0];
  const lineageIds = useMemo(
    () => [
      assignment?.geographic_unit_id,
      detail?.agent_profile?.home_geographic_unit_id,
      ...(detail?.recent_field_reports ?? []).map((r) => r.geographic_unit_id),
    ],
    [assignment, detail],
  );
  const lineage = useUnitLineage(lineageIds);

  if (detailQuery.isLoading) {
    return (
      <Panel title="Loading agent…">
        <LoadingRows rows={4} padded={false} />
      </Panel>
    );
  }

  if (!detail) {
    const notFound = toApiError(detailQuery.error).status === 404;
    return (
      <Panel title={notFound ? "Agent not found" : "Couldn't load this agent"}>
        <p className="text-sm text-muted-foreground">
          {notFound ? (
            <>
              No agent in this campaign matches <span className="font-mono">{agentId}</span>.
            </>
          ) : (
            errorMessage(detailQuery.error)
          )}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/agents")}>
          <ArrowLeft className="h-4 w-4" />
          Back to roster
        </Button>
      </Panel>
    );
  }

  const name = detail.user.name;
  const firstName = name.split(" ")[0];
  const role = dutyLabel(assignment?.duty);
  const place = lineage(assignment?.geographic_unit_id ?? detail.agent_profile?.home_geographic_unit_id);
  const location = [place?.state?.name, place?.lga?.name].filter(Boolean).join(" · ") || "—";
  const heartbeat = activity.data?.agents.find((a) => a.membership_id === agentId)?.last_heartbeat_at;
  const status = presenceOf(heartbeat, now);

  const agentTasks = detail.recent_tasks;
  const visibleTasks =
    taskFilter === "All"
      ? agentTasks
      : agentTasks.filter((t) => STATUS_LABEL[t.status] === taskFilter);
  const completed = detail.stats.tasks_completed;
  const open = agentTasks.filter((t) => t.status === "open" || t.status === "in_progress").length;
  const taskPct = Math.round(
    detail.stats.task_completion_percent ??
      (detail.stats.tasks_total ? (completed / detail.stats.tasks_total) * 100 : 0),
  );
  const reports = detail.recent_field_reports;
  const totalReports = detail.stats.field_reports + detail.stats.polling_reports;

  return (
    <>
      <Link
        to="/agents"
        className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Agents &amp; Structure
      </Link>

      <PageHeader
        title={name}
        subtitle={`${role} · ${location}`}
        actions={
          <>
            <Badge tone={STATUS_TONE[status]} dot>
              {status}
            </Badge>
            <Button
              variant="primary"
              onClick={() => setAssignOpen(true)}
              disabled={!access?.can_manage || !assignment || assignment.ends_at != null}
            >
              <Plus className="h-4 w-4" />
              Assign Task
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Reports Submitted"
          value={totalReports.toLocaleString()}
          caption={`${reports.length} in the recent feed`}
          tone="primary"
          icon={<Rss className="h-4 w-4" />}
        />
        <StatCard
          label="Task Completion"
          value={`${taskPct}%`}
          caption="Of tasks assigned in this campaign"
          tone="accent"
          icon={<ClipboardList className="h-4 w-4" />}
        />
        <StatCard
          label="Open Tasks"
          value={String(open)}
          caption={`${detail.stats.tasks_total} assigned in total`}
          tone="warning"
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <StatCard
          label="Completed"
          value={String(completed)}
          caption="In this campaign"
          tone="info"
          icon={<ClipboardList className="h-4 w-4" />}
        />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Panel
            title="Assigned Tasks"
            subtitle={`${agentTasks.length} recent task${agentTasks.length === 1 ? "" : "s"} in this campaign`}
            icon={<ClipboardList className="h-4 w-4" />}
            bodyClassName="p-0"
          >
            <div className="border-b border-border px-4 py-3 sm:px-5">
              <SegmentedControl
                options={TASK_FILTERS}
                value={taskFilter}
                onChange={setTaskFilter}
                size="sm"
              />
            </div>

            <ul className="divide-y divide-border">
              {visibleTasks.map((t) => {
                const taskStatus = STATUS_LABEL[t.status];
                const priority = PRIORITY_LABEL[t.priority];
                const category = t.category ? CATEGORY_LABEL[t.category] : null;
                const done = t.status === "completed" || t.status === "cancelled";
                return (
                  <li key={t.id} className="px-4 py-3.5 sm:px-5">
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

                    {t.instructions && (
                      <p className="mt-1.5 text-[11px] italic leading-relaxed text-muted-foreground">
                        “{t.instructions}”
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        Due {formatDue(t.due_at, new Date(now))}
                      </span>
                      <span className="ml-auto">
                        <Badge tone={TASK_STATUS_TONE[taskStatus]}>{taskStatus}</Badge>
                      </span>
                    </div>
                  </li>
                );
              })}

              {visibleTasks.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                  {agentTasks.length === 0
                    ? `No tasks assigned to ${firstName} yet.`
                    : `No ${taskFilter.toLowerCase()} tasks.`}
                </li>
              )}
            </ul>
          </Panel>

          <Panel
            title="Submitted Reports"
            subtitle={`${reports.length} recent field report${reports.length === 1 ? "" : "s"}`}
            icon={<Rss className="h-4 w-4" />}
            bodyClassName="p-0"
          >
            <ol className="divide-y divide-border">
              {reports.map((r) => {
                const type = r.collection_method ? METHOD_LABEL[r.collection_method] : null;
                const where = lineage(r.geographic_unit_id);
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
                        {[where?.state?.name, where?.lga?.name, where?.ward?.name]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </button>
                  </li>
                );
              })}

              {reports.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                  {firstName} has not filed a report yet.
                </li>
              )}
            </ol>
          </Panel>
        </div>

        <Panel title="Profile" icon={<UserCircle className="h-4 w-4" />}>
          <div className="flex items-center gap-3">
            <Avatar
              initials={initialsOf(name)}
              className="h-12 w-12 text-sm"
              tone={status === "active" ? "primary" : "muted"}
            />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold">{name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{role}</p>
            </div>
          </div>

          <dl className="mt-4 space-y-3 border-t border-border pt-4">
            <Row icon={<MapPin className="h-3.5 w-3.5" />} label="Location">
              {location}
            </Row>
            <Row icon={<Mail className="h-3.5 w-3.5" />} label="Email">
              {detail.user.email ?? "—"}
            </Row>
            <Row icon={<Phone className="h-3.5 w-3.5" />} label="Phone">
              {detail.agent_profile?.phone ?? detail.user.phone ?? "—"}
            </Row>
          </dl>

          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Task completion
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums">{taskPct}%</span>
            </div>
            <Meter
              value={taskPct}
              className="mt-2"
              height="h-2"
              barClassName={
                taskPct >= 85 ? "bg-success" : taskPct >= 70 ? "bg-warning" : "bg-destructive"
              }
            />
          </div>
        </Panel>
      </div>

      <FieldReportDialog report={viewing} onClose={() => setViewing(null)} />

      <NewTaskModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        presetAgentId={agentId}
        onCreate={(task) => {
          toast.success(`${task.category} assigned to ${task.assignee} — due ${task.due}.`);
        }}
      />
    </>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
        <dd className="truncate text-[12px]">{children}</dd>
      </div>
    </div>
  );
}
