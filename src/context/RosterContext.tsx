import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Agent } from "../lib/data";

interface RosterValue {
  /** Agents provisioned in this session, newest first. */
  created: Agent[];
  addAgent: (agent: Agent) => void;
}

const RosterContext = createContext<RosterValue | null>(null);

/**
 * Holds agents added through the app so every page sees them — the Agents
 * roster lists them and the task composer can assign work to them. There is no
 * API yet, so this lives in memory and resets on reload.
 */
export function RosterProvider({ children }: { children: ReactNode }) {
  const [created, setCreated] = useState<Agent[]>([]);

  const addAgent = useCallback((agent: Agent) => {
    setCreated((prev) => [agent, ...prev]);
  }, []);

  const value = useMemo(() => ({ created, addAgent }), [created, addAgent]);

  return <RosterContext.Provider value={value}>{children}</RosterContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRoster(): RosterValue {
  const ctx = useContext(RosterContext);
  if (!ctx) throw new Error("useRoster must be used inside <RosterProvider>");
  return ctx;
}
