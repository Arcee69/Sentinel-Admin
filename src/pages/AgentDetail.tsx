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
import { NewTaskModal } from "../components/NewTaskModal";
import { useRoster } from "../context/RosterContext";
import { useTasks } from "../context/TasksContext";
import {
  AGENTS,
  FIELD_REPORTS,
  type AgentStatus,
  type Priority,
  type ReportType,
  type TaskCategory,
  type TaskStatus,
} from "../lib/data";
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

const TASK_STATUS_TONE: Record<TaskStatus, BadgeTone> = {
  Pending: "muted",
  "In Progress": "primary",
  Completed: "success",
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
  const { agentId = "" } = useParams();
  const navigate = useNavigate();
  const { created } = useRoster();
  const { tasks } = useTasks();
  const [taskFilter, setTaskFilter] = useState<(typeof TASK_FILTERS)[number]>("All");
  const [assignOpen, setAssignOpen] = useState(false);

  // Looked up across the whole roster, not the scoped slice — arriving here is
  // a deliberate navigation, so the current filter shouldn't 404 the page.
  const agent = useMemo(
    () => [...created, ...AGENTS].find((a) => a.id === agentId),
    [created, agentId],
  );

  const agentTasks = useMemo(
    () => tasks.filter((t) => t.assigneeId === agentId),
    [tasks, agentId],
  );

  const reports = useMemo(
    () => FIELD_REPORTS.filter((r) => r.agentId === agentId),
    [agentId],
  );

  if (!agent) {
    return (
      <Panel title="Agent not found">
        <p className="text-sm text-muted-foreground">
          No agent matches <span className="font-mono">{agentId}</span>. They may have been
          added in a previous session — session-provisioned agents reset on reload.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/agents")}>
          <ArrowLeft className="h-4 w-4" />
          Back to roster
        </Button>
      </Panel>
    );
  }

  const visibleTasks =
    taskFilter === "All" ? agentTasks : agentTasks.filter((t) => t.status === taskFilter);
  const completed = agentTasks.filter((t) => t.status === "Completed").length;
  const open = agentTasks.length - completed;

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
        title={agent.name}
        subtitle={`${agent.role} · ${agent.state} · ${agent.lga}`}
        actions={
          <>
            <Badge tone={STATUS_TONE[agent.status]} dot>
              {agent.status}
            </Badge>
            <Button variant="primary" onClick={() => setAssignOpen(true)}>
              <Plus className="h-4 w-4" />
              Assign Task
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Reports Submitted"
          value={agent.reports.toLocaleString()}
          caption={`${reports.length} in the recent feed`}
          tone="primary"
          icon={<Rss className="h-4 w-4" />}
        />
        <StatCard
          label="Task Completion"
          value={`${agent.taskPct}%`}
          caption="Rolling 30-day rate"
          tone="accent"
          icon={<ClipboardList className="h-4 w-4" />}
        />
        <StatCard
          label="Open Tasks"
          value={String(open)}
          caption={`${agentTasks.length} assigned in total`}
          tone="warning"
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <StatCard
          label="Completed"
          value={String(completed)}
          caption="Across all campaigns"
          tone="info"
          icon={<ClipboardList className="h-4 w-4" />}
        />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Panel
            title="Assigned Tasks"
            subtitle={`${agentTasks.length} task${agentTasks.length === 1 ? "" : "s"} across all campaigns`}
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
              {visibleTasks.map((t) => (
                <li key={t.id} className="px-4 py-3.5 sm:px-5">
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

                  {t.notes && (
                    <p className="mt-1.5 text-[11px] italic leading-relaxed text-muted-foreground">
                      “{t.notes}”
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      Due {t.due}
                    </span>
                    <span className="ml-auto">
                      <Badge tone={TASK_STATUS_TONE[t.status]}>{t.status}</Badge>
                    </span>
                  </div>
                </li>
              ))}

              {visibleTasks.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                  {agentTasks.length === 0
                    ? `No tasks assigned to ${agent.name.split(" ")[0]} yet.`
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
              {reports.map((r) => (
                <li key={r.id} className="px-4 py-3.5 sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone={TYPE_TONE[r.type]}>{r.type}</Badge>
                    <span className="font-mono text-[10px] text-muted-foreground">{r.time}</span>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed">{r.body}</p>
                  <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                    {r.location}
                  </p>
                </li>
              ))}

              {reports.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                  {agent.name.split(" ")[0]} has not filed a report yet.
                </li>
              )}
            </ol>
          </Panel>
        </div>

        <Panel title="Profile" icon={<UserCircle className="h-4 w-4" />}>
          <div className="flex items-center gap-3">
            <Avatar
              initials={agent.initials}
              className="h-12 w-12 text-sm"
              tone={agent.status === "active" ? "primary" : "muted"}
            />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold">{agent.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{agent.role}</p>
            </div>
          </div>

          <dl className="mt-4 space-y-3 border-t border-border pt-4">
            <Row icon={<MapPin className="h-3.5 w-3.5" />} label="Location">
              {agent.state} · {agent.lga}
            </Row>
            <Row icon={<Mail className="h-3.5 w-3.5" />} label="Email">
              {agent.email ?? "—"}
            </Row>
            <Row icon={<Phone className="h-3.5 w-3.5" />} label="Phone">
              {agent.phone ?? "—"}
            </Row>
          </dl>

          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Task completion
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {agent.taskPct}%
              </span>
            </div>
            <Meter
              value={agent.taskPct}
              className="mt-2"
              height="h-2"
              barClassName={
                agent.taskPct >= 85
                  ? "bg-success"
                  : agent.taskPct >= 70
                    ? "bg-warning"
                    : "bg-destructive"
              }
            />
          </div>
        </Panel>
      </div>

      <NewTaskModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        presetAgentId={agent.id}
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
