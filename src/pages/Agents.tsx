import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQueries } from "@tanstack/react-query";
import { ChevronRight, Network, Plus, Search, Users } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Badge, type BadgeTone } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import { Meter } from "../components/ui/Meter";
import { Input } from "../components/ui/Field";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { ErrorState, LoadingRows } from "../components/ui/AsyncState";
import { type AgentRole, type AgentStatus } from "../lib/data";
import { AddAgentModal } from "../components/AddAgentModal";
import { InvitationCodeDialog } from "../components/InvitationCodeDialog";
import { useFilters } from "../context/FilterContext";
import { useCampaignRoster, type AgentInvitation } from "../hooks/api/useAgents";
import { GEO_STALE, unitsKey, useGeoUnits } from "../hooks/api/useGeography";
import { geographyApi } from "../services/geography";
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
  const [openState, setOpenState] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [invited, setInvited] = useState<{
    invitation: AgentInvitation;
    duty: AgentRole | "";
  } | null>(null);
  const navigate = useNavigate();
  const { apiCampaign, stateUnits, scopeUnit, scopeLabel } = useFilters();
  const { roster: campaignRoster, isLoading, error, refetch } = useCampaignRoster(apiCampaign?.id);

  // Agents outside the topbar scope are hidden; unplaced ones stay visible.
  const roster = useMemo(
    () =>
      campaignRoster.filter((a) => !scopeUnit || !a.stateId || a.stateId === scopeUnit.id),
    [campaignRoster, scopeUnit],
  );

  // One row per state in scope, busiest first, so the tree mirrors the roster.
  const hierarchy = useMemo(
    () =>
      stateUnits
        .filter((s) => !scopeUnit || s.id === scopeUnit.id)
        .map((s) => ({
          id: s.id,
          state: s.name,
          agents: roster.filter((a) => a.stateId === s.id).length,
        }))
        .sort((a, b) => b.agents - a.agents || a.state.localeCompare(b.state)),
    [stateUnits, scopeUnit, roster],
  );
  // Open the busiest state until the user picks one.
  const expanded = openState ?? hierarchy[0]?.id ?? null;

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

          {isLoading ? (
            <LoadingRows rows={4} />
          ) : error ? (
            <ErrorState error={error} onRetry={() => refetch()} />
          ) : (
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
                      {[a.state, a.lga].filter(Boolean).join(" · ") || "—"}
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
                      {roster.length === 0
                        ? `No agents assigned in ${scopeLabel}.`
                        : "No agents match that search."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}
        </Panel>

        <Panel
          title="Hierarchy"
          subtitle="State → LGA → Ward"
          icon={<Network className="h-4 w-4" />}
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {hierarchy.map((h) => {
              const open = expanded === h.id;
              return (
                <li key={h.id}>
                  <button
                    onClick={() => setOpenState(open ? "" : h.id)}
                    className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-secondary/40 sm:px-5"
                  >
                    <ChevronRight
                      className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-90")}
                    />
                    <span className="flex-1 text-[13px] font-medium">{h.state}</span>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {h.agents} agents
                    </span>
                  </button>

                  {open && <LgaList versionId={apiCampaign?.geography_version_id} stateId={h.id} />}
                </li>
              );
            })}
            {hierarchy.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-muted-foreground">
                No states loaded for this campaign.
              </li>
            )}
          </ul>
        </Panel>
      </div>

      <AddAgentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={(invitation, duty) => {
          setInvited({ invitation, duty });
          toast.success(`Invitation created for ${invitation.name}.`);
        }}
      />

      <InvitationCodeDialog invitation={invited?.invitation ?? null} onClose={() => setInvited(null)}>
        {invited?.duty && (
          <p className="text-[11px] text-muted-foreground">
            Planned duty: <span className="font-medium text-foreground">{invited.duty}</span> — set
            it when you assign {invited.invitation.name.split(" ")[0]} to a campaign after they
            accept.
          </p>
        )}
      </InvitationCodeDialog>
    </>
  );
}

/** A state's LGAs with how many wards each holds, fetched when the state opens. */
function LgaList({ versionId, stateId }: { versionId: string | undefined; stateId: string }) {
  const lgas = useGeoUnits(versionId, stateId);
  const wards = useQueries({
    queries: (lgas.data ?? []).map((lga) => ({
      queryKey: unitsKey(versionId, lga.id),
      queryFn: async () => (await geographyApi.units(versionId!, { parent_id: lga.id })).data,
      enabled: !!versionId,
      staleTime: GEO_STALE,
    })),
  });

  return (
    <ul className="space-y-1 border-t border-border bg-background/40 px-5 py-2.5 sm:px-6">
      {lgas.isLoading && (
        <li className="px-2 py-1.5 text-[12px] text-muted-foreground">Loading LGAs…</li>
      )}
      {lgas.data?.length === 0 && (
        <li className="px-2 py-1.5 text-[12px] text-muted-foreground">No LGAs recorded.</li>
      )}
      {(lgas.data ?? []).map((lga, i) => {
        const count = wards[i]?.data?.length;
        return (
          <li
            key={lga.id}
            className="flex items-center justify-between rounded-md px-2 py-1.5 text-[12px] hover:bg-secondary/40"
          >
            <span className="text-muted-foreground">{lga.name}</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {count == null ? "…" : `${count} ward${count === 1 ? "" : "s"}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
