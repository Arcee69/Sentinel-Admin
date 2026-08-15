import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { TASKS, type Task, type TaskStatus } from "../lib/data";

interface TasksValue {
  /** Every task, newest first. Filtering by campaign/scope is the caller's job. */
  tasks: Task[];
  addTask: (task: Task) => void;
  setStatus: (id: string, status: TaskStatus) => void;
}

const TasksContext = createContext<TasksValue | null>(null);

/**
 * Shared so the Operations board and an agent's detail page read the same
 * list — a task assigned in one is immediately visible in the other. In memory
 * only; there is no API to persist to yet.
 */
export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(TASKS);

  const addTask = useCallback((task: Task) => {
    setTasks((prev) => [task, ...prev]);
  }, []);

  const setStatus = useCallback((id: string, status: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }, []);

  const value = useMemo(() => ({ tasks, addTask, setStatus }), [tasks, addTask, setStatus]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTasks(): TasksValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used inside <TasksProvider>");
  return ctx;
}
