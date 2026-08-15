import { useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  AlertCircle,
  AlertOctagon,
  ClipboardList,
  Flag,
  Loader2,
  MessageSquareQuote,
  Plus,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Input, Label, Select, Textarea } from "./ui/Field";
import { useFilters } from "../context/FilterContext";
import { useScopedData } from "../hooks/useScopedData";
import { useTasks } from "../context/TasksContext";
import {
  AGENTS,
  TASK_CATEGORIES,
  type Priority,
  type Task,
  type TaskCategory,
} from "../lib/data";
import { useRoster } from "../context/RosterContext";
import { cn } from "../lib/cn";

const CATEGORY_ICON: Record<TaskCategory, LucideIcon> = {
  "Opinion Poll": MessageSquareQuote,
  "Election Report": ClipboardList,
  "Incident Report": AlertOctagon,
};

const CATEGORY_TONE: Record<TaskCategory, string> = {
  "Opinion Poll": "text-chart-1",
  "Election Report": "text-chart-2",
  "Incident Report": "text-destructive",
};

const PRIORITIES: Priority[] = ["High", "Medium", "Low"];

const schema = Yup.object({
  category: Yup.string().required("Pick a task category."),
  subject: Yup.string().required("Pick what the agent should report on."),
  title: Yup.string().trim().min(6, "Give the task a clearer title.").required("Title is required."),
  assigneeId: Yup.string().required("Assign the task to an agent."),
  priority: Yup.string().required("Select a priority."),
  due: Yup.string().required("Set a due date."),
});

interface Props {
  open: boolean;
  onClose: () => void;
  /** Locks the assignee — used when composing from an agent's own page. */
  presetAgentId?: string;
  /** Fired after the task is added, for the caller's confirmation message. */
  onCreate?: (task: Task) => void;
}

/** "Wed 17 Sep" — matches the short form the seed tasks use. */
function formatDue(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";

  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function NewTaskModal({ open, onClose, presetAgentId, onCreate }: Props) {
  const { campaign } = useFilters();
  const { agents, scopeLabel } = useScopedData();
  const { addTask } = useTasks();
  const { created } = useRoster();

  // When preset, the agent may sit outside the current scope, so resolve
  // against the whole roster rather than the scoped list.
  const presetAgent = presetAgentId
    ? [...created, ...AGENTS].find((a) => a.id === presetAgentId)
    : undefined;
  const assignable = presetAgent ? [presetAgent] : agents;

  const formik = useFormik({
    initialValues: {
      category: "" as TaskCategory | "",
      subject: "",
      title: "",
      assigneeId: presetAgentId ?? "",
      priority: "Medium" as Priority,
      due: "",
      notes: "",
    },
    validationSchema: schema,
    onSubmit: async (values, helpers) => {
      // No API yet — the pause stands in for the round trip.
      await new Promise((r) => setTimeout(r, 550));

      const agent = assignable.find((a) => a.id === values.assigneeId)!;

      const task: Task = {
        id: `t-${Date.now()}`,
        title: values.title.trim(),
        category: values.category as TaskCategory,
        subject: values.subject,
        priority: values.priority,
        assignee: agent.name,
        assigneeId: agent.id,
        // The agent carries the geography, so the task inherits it.
        state: agent.state,
        lga: agent.lga,
        due: formatDue(values.due),
        status: "Pending",
        campaignId: campaign.id,
        notes: values.notes.trim() || undefined,
      };

      addTask(task);
      onCreate?.(task);

      helpers.resetForm();
      onClose();
    },
  });

  useEffect(() => {
    if (open) {
      formik.resetForm({
        values: { ...formik.initialValues, assigneeId: presetAgentId ?? "" },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetAgentId]);

  const activeCategory = TASK_CATEGORIES.find((c) => c.id === formik.values.category);

  function fieldError(name: keyof typeof formik.values) {
    return formik.touched[name] && formik.errors[name] ? formik.errors[name] : undefined;
  }

  function pickCategory(id: TaskCategory) {
    formik.setFieldValue("category", id);
    // Subjects belong to a category, so drop the stale one.
    formik.setFieldValue("subject", "");
    formik.setFieldValue("title", "");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Task"
      description="Dispatch field work to an agent."
      icon={<Plus className="h-4.5 w-4.5" />}
      className="sm:max-w-2xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={formik.isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => formik.handleSubmit()}
            disabled={formik.isSubmitting}
          >
            {formik.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create Task
          </Button>
        </div>
      }
    >
      <form onSubmit={formik.handleSubmit} className="space-y-4" noValidate>
        {/* The task is bound to the campaign active in the topbar. */}
        <div className="flex items-start gap-2.5 rounded-lg border border-primary/25 bg-primary/8 px-3 py-2.5">
          <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Task campaign
            </p>
            <p className="truncate text-[13px] font-semibold text-primary">{campaign.name}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {campaign.cycle} · {campaign.scopeLabel} — this task will only appear under this
              campaign.
            </p>
          </div>
        </div>

        {/* 1 — Category */}
        <div className="space-y-1.5">
          <Label>Task category</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {TASK_CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICON[c.id];
              const active = formik.values.category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => pickCategory(c.id)}
                  className={cn(
                    "cursor-pointer rounded-lg border p-3 text-left transition-colors",
                    active
                      ? "border-primary/60 bg-primary/10 ring-1 ring-primary/30"
                      : "border-border bg-secondary/25 hover:border-primary/35",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-primary" : CATEGORY_TONE[c.id])} />
                  <span className="mt-1.5 block text-[12px] font-semibold">{c.id}</span>
                  <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                    {c.blurb}
                  </span>
                </button>
              );
            })}
          </div>
          {fieldError("category") && <ErrorText>{fieldError("category")}</ErrorText>}
        </div>

        {/* 2 — Subject within the category */}
        <div className="space-y-1.5">
          <Label htmlFor="subject">What should the agent report on?</Label>
          <Select
            id="subject"
            name="subject"
            disabled={!activeCategory}
            value={formik.values.subject}
            onBlur={formik.handleBlur}
            onChange={(e) => {
              formik.setFieldValue("subject", e.target.value);
              // Seed the title from the focus, but never clobber wording the
              // operator typed. A title that is still empty or is verbatim a
              // subject was auto-filled, so it is safe to replace.
              const current = formik.values.title.trim();
              const autoFilled =
                !current || TASK_CATEGORIES.some((c) => c.subjects.includes(current));
              if (e.target.value && autoFilled) {
                formik.setFieldValue("title", e.target.value);
              }
            }}
            aria-invalid={!!fieldError("subject")}
            className={cn(
              "h-10 w-full",
              fieldError("subject") && "border-destructive/60",
              !activeCategory && "opacity-60",
            )}
          >
            <option value="">
              {activeCategory ? "Select a focus…" : "Pick a category first"}
            </option>
            {activeCategory?.subjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </Select>
          {fieldError("subject") && <ErrorText>{fieldError("subject")}</ErrorText>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">Task title</Label>
          <Input
            id="title"
            name="title"
            placeholder="e.g. Poll 200 voters in Ikeja on candidate preference"
            value={formik.values.title}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            aria-invalid={!!fieldError("title")}
            className={fieldError("title") ? "border-destructive/60" : undefined}
          />
          {fieldError("title") && <ErrorText>{fieldError("title")}</ErrorText>}
        </div>

        {/* 3 — Assignment */}
        <div className="space-y-1.5">
          <Label htmlFor="assigneeId">Assign to agent</Label>
          <div className="relative">
            <UserCheck className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Select
              id="assigneeId"
              name="assigneeId"
              value={formik.values.assigneeId}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              disabled={!!presetAgent}
              aria-invalid={!!fieldError("assigneeId")}
              className={cn(
                "h-10 w-full pl-9",
                fieldError("assigneeId") && "border-destructive/60",
                presetAgent && "opacity-70",
              )}
            >
              {!presetAgent && (
                <option value="">
                  {agents.length ? "Select an agent…" : `No agents in ${scopeLabel}`}
                </option>
              )}
              {assignable.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.role}, {a.lga} ({a.state})
                </option>
              ))}
            </Select>
          </div>
          {fieldError("assigneeId") ? (
            <ErrorText>{fieldError("assigneeId")}</ErrorText>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              {presetAgent
                ? `Assigned to ${presetAgent.name}. The task inherits their state and LGA.`
                : `Showing ${agents.length} agent${agents.length === 1 ? "" : "s"} in ${scopeLabel}. The task inherits the agent's state and LGA.`}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="priority">Priority</Label>
            <div className="flex gap-1.5">
              {PRIORITIES.map((pr) => {
                const active = formik.values.priority === pr;
                return (
                  <button
                    key={pr}
                    type="button"
                    aria-pressed={active}
                    onClick={() => formik.setFieldValue("priority", pr)}
                    className={cn(
                      "flex-1 cursor-pointer rounded-md border px-2 py-1.5 text-[12px] font-medium transition-colors",
                      active
                        ? pr === "High"
                          ? "border-destructive/50 bg-destructive/12 text-destructive"
                          : pr === "Medium"
                            ? "border-warning/50 bg-warning/12 text-warning"
                            : "border-info/50 bg-info/12 text-info"
                        : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {pr}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="due">Due date</Label>
            <Input
              id="due"
              name="due"
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={formik.values.due}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              aria-invalid={!!fieldError("due")}
              className={fieldError("due") ? "border-destructive/60" : undefined}
            />
            {fieldError("due") && <ErrorText>{fieldError("due")}</ErrorText>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Instructions (optional)</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Anything the agent needs to know before heading out…"
            value={formik.values.notes}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />
        </div>

        <button type="submit" className="hidden" tabIndex={-1} aria-hidden />
      </form>
    </Modal>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-center gap-1 text-[11px] text-destructive">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {children}
    </p>
  );
}
