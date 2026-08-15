import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChevronRight, Network, Plus, Search, Users } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Badge, type BadgeTone } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import { Meter } from "../components/ui/Meter";
import { Input } from "../components/ui/Field";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { type AgentStatus } from "../lib/data";
import { useRoster } from "../context/RosterContext";
import { AddAgentModal } from "../components/AddAgentModal";
import { useScopedData } from "../hooks/useScopedData";
import { cn } from "../lib/cn";

const STATUS_TONE: Record<AgentStatus, BadgeTone> = {
  active: "success",
  idle: "warning",
  offline: "muted",
};

const FILTERS = ["All", "Active", "Idle", "Offline"] as const;

export default function Agents() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [openState, setOpenState] = useState<string | null>("Lagos");
  const [addOpen, setAddOpen] = useState(false);
  const navigate = useNavigate();
  const { addAgent } = useRoster();
  // `agents` already merges session-provisioned agents and applies the scope.
  const { agents: roster, hierarchy, scopeLabel, inScope } = useScopedData();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roster.filter((a) => {
      const matchesFilter = filter === "All" || a.status === filter.toLowerCase();
      const matchesQuery =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.state.toLowerCase().includes(q) ||
        a.lga.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [query, filter, roster]);

  return (
    <>
      <PageHeader
        title="Agents & Structure"
        subtitle={`${roster.length} agent${roster.length === 1 ? "" : "s"} across ${scopeLabel}`}
        actions={
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Agent
          </Button>
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel
          title="Agent Roster"
          subtitle={`${visible.length} shown · select a row for detail`}
          icon={<Users className="h-4 w-4" />}
          bodyClassName="p-0"
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 sm:px-5">
            <div className="relative min-w-52 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, role, state or LGA…"
                className="h-9 pl-8 text-xs"
              />
            </div>
            <SegmentedControl
              options={FILTERS}
              value={filter}
              onChange={setFilter}
              size="sm"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-205 text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider whitespace-nowrap text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium sm:px-5">Agent</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Location</th>
                  <th className="px-4 py-2.5 text-right font-medium">Reports</th>
                  <th className="px-4 py-2.5 font-medium">Task %</th>
                  <th className="px-4 py-2.5 font-medium sm:px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/agents/${a.id}`)}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open ${a.name}'s profile`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/agents/${a.id}`);
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-secondary/40 focus-visible:bg-secondary/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <td className="px-4 py-3 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          initials={a.initials}
                          className="h-8 w-8"
                          tone={a.status === "active" ? "primary" : "muted"}
                        />
                        <span className="font-medium">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{a.role}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.state} · {a.lga}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {a.reports}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Meter
                          value={a.taskPct}
                          className="w-16"
                          barClassName={
                            a.taskPct >= 85
                              ? "bg-success"
                              : a.taskPct >= 70
                                ? "bg-warning"
                                : "bg-destructive"
                          }
                        />
                        <span className="font-mono text-[11px] tabular-nums">
                          {a.taskPct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone={STATUS_TONE[a.status]} dot>
                          {a.status}
                        </Badge>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </div>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-sm text-muted-foreground"
                    >
                      No agents match that search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Hierarchy"
          subtitle="State → LGA → Ward"
          icon={<Network className="h-4 w-4" />}
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {hierarchy.map((h) => {
              const lgas = h.lgas;
              const open = openState === h.state;
              return (
                <li key={h.state}>
                  <button
                    onClick={() => setOpenState(open ? null : h.state)}
                    disabled={!lgas}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors sm:px-5",
                      lgas ? "cursor-pointer hover:bg-secondary/40" : "cursor-default",
                    )}
                  >
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-transform",
                        open && "rotate-90",
                        !lgas && "opacity-25",
                      )}
                    />
                    <span className="flex-1 text-[13px] font-medium">{h.state}</span>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {h.agents} agents
                    </span>
                  </button>

                  {open && lgas && (
                    <ul className="space-y-1 border-t border-border bg-background/40 px-5 py-2.5 sm:px-6">
                      {lgas.map((lga) => (
                        <li
                          key={lga}
                          className="flex items-center justify-between rounded-md px-2 py-1.5 text-[12px] hover:bg-secondary/40"
                        >
                          <span className="text-muted-foreground">{lga}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            5 wards
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <AddAgentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={(agent) => {
          addAgent(agent);
          toast.success(`${agent.name} added as ${agent.role} — ${agent.lga}, ${agent.state}.`);

          // Provisioning for a state outside the current scope is legitimate,
          // but the new row would silently not appear. Say so.
          if (!inScope(agent.state)) {
            toast.info(
              `Showing ${scopeLabel} — switch scope to ${agent.state} to see ${agent.name}.`,
            );
          }
        }}
      />
    </>
  );
}
