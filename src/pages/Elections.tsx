import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  CalendarDays,
  CircleCheck,
  Circle,
  Download,
  Link2,
  RefreshCw,
  Search,
  UsersRound,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Button } from "../components/ui/Button";
import { StatCard } from "../components/ui/StatCard";
import { Input, Select } from "../components/ui/Field";
import { TabPanel, TabsList } from "../components/ui/Tabs";
import { ErrorState, LoadingRows } from "../components/ui/AsyncState";
import {
  useCandidates,
  useContests,
  useElectionCycles,
  useElectoralDistricts,
  useMilestones,
  useParties,
  useReferenceSources,
} from "../hooks/api/useElections";
import { useUnitNames } from "../hooks/useUnitNames";
import { useNow } from "../hooks/useNow";
import { formatDate, humanize, parseApiDate } from "../lib/format";
import { electionsApi, type OfficeType, type ReferenceSource } from "../services/elections";
import { errorMessage } from "../services/errors";
import { cn } from "../lib/cn";

/**
 * Status palette — reserved, always paired with the status word. The
 * catalog reports publication states rather than the mock lifecycle.
 */
const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-success/15 text-success",
  withdrawn: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
};
const STATUS_FALLBACK = "bg-primary/15 text-primary";

/** Source review state, shown in the reliability slot. */
const REVIEW_TONE: Record<string, string> = {
  reviewed: "bg-success/15 text-success",
  pending_review: "bg-muted text-muted-foreground",
};

const TABS = [
  { value: "matrix", label: "Master Matrix" },
  { value: "candidates", label: "Candidates" },
  { value: "parties", label: "Parties" },
  { value: "calendar", label: "Lifecycle" },
  { value: "sources", label: "Sources" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const PAGE_SIZE = 12;

/** Party colours aren't in the catalog; a stable pick per party keeps badges readable. */
const PARTY_PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

function partyColor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return PARTY_PALETTE[Math.abs(h) % PARTY_PALETTE.length];
}

type Tier = "federal" | "state" | "local";

function tierOf(office: OfficeType): Tier {
  const o = office.toLowerCase();
  if (o.includes("governor") || o.includes("state")) return "state";
  if (o.includes("chair") || o.includes("council") || o.includes("local")) return "local";
  return "federal";
}

const fmtDate = (value: string | null | undefined) => (value ? formatDate(value) : "TBC");

const fmtNum = (n: number) => n.toLocaleString("en-US");

export default function Elections() {
  const queryClient = useQueryClient();
  const unitName = useUnitNames();
  const now = useNow();
  const [tab, setTab] = useState<TabValue>("matrix");
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<Tier | "all">("all");
  const [state, setState] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const cyclesQuery = useElectionCycles();
  const cycleIds = useMemo(() => (cyclesQuery.data ?? []).map((c) => c.id), [cyclesQuery.data]);
  const contestsQuery = useContests(cycleIds);
  const milestonesQuery = useMilestones(cycleIds);
  const districtsQuery = useElectoralDistricts();
  const partiesQuery = useParties();
  const sourcesQuery = useReferenceSources();
  const contestIds = useMemo(
    () => (contestsQuery.data ?? []).map((c) => c.id),
    [contestsQuery.data],
  );
  const candidatesQuery = useCandidates(contestIds);

  const PARTIES = useMemo(() => partiesQuery.data ?? [], [partiesQuery.data]);
  const CANDIDATES = candidatesQuery.data ?? [];
  const SOURCES = sourcesQuery.data ?? [];
  const MILESTONES = useMemo(
    () =>
      [...(milestonesQuery.data ?? [])].sort((a, b) => a.scheduled_on.localeCompare(b.scheduled_on)),
    [milestonesQuery.data],
  );

  // Matrix rows: each contest with its district as the scope.
  const RACES = useMemo(() => {
    const districts = new Map((districtsQuery.data ?? []).map((d) => [d.id, d]));
    return (contestsQuery.data ?? []).map((c) => ({
      id: c.id,
      title: c.name,
      type: { name: humanize(c.office_type), tier: tierOf(c.office_type) },
      scope: districts.get(c.electoral_district_id)?.name ?? null,
      date: c.election_date,
      status: c.status,
      registeredVoters: c.registered_count,
      incumbent: c.incumbent_name,
    }));
  }, [contestsQuery.data, districtsQuery.data]);

  const states = useMemo(
    () => Array.from(new Set(RACES.map((r) => r.scope).filter(Boolean) as string[])).sort(),
    [RACES],
  );
  const statuses = useMemo(() => Array.from(new Set(RACES.map((r) => r.status))).sort(), [RACES]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RACES.filter((r) => {
      if (tier !== "all" && r.type.tier !== tier) return false;
      if (state !== "all" && r.scope !== state) return false;
      if (status !== "all" && r.status !== status) return false;
      if (q && !`${r.title} ${r.scope ?? ""} ${r.type.name}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [RACES, query, tier, state, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Clamp so deleting filters can never strand you past the last page.
  const safePage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const sourced = RACES.filter((r) => r.registeredVoters != null);
  const totalVoters = sourced.reduce((t, r) => t + (r.registeredVoters ?? 0), 0);
  const isPast = (iso: string) => (parseApiDate(iso)?.getTime() ?? 0) < now;
  const nextMilestone = MILESTONES.find((m) => !isPast(m.scheduled_on));
  const verifiedPct = SOURCES.length
    ? Math.round((SOURCES.filter((s) => s.status === "reviewed").length / SOURCES.length) * 100)
    : 0;

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(0);
    };
  }

  async function refresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["catalog"] });
    setRefreshing(false);
    toast.success("Election matrix refreshed.");
  }

  async function openSource(s: ReferenceSource) {
    try {
      const blob = await electionsApi.downloadSource(s.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = s.original_filename ?? `${s.title}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  function exportCsv() {
    const header = ["Race", "Type", "Tier", "Scope", "Date", "Status", "Registered voters", "Incumbent"];
    const body = filtered.map((r) => [
      r.title,
      r.type.name,
      r.type.tier,
      r.scope ?? "",
      r.date ?? "",
      r.status,
      r.registeredVoters == null ? "" : String(r.registeredVoters),
      r.incumbent ?? "",
    ]);
    const csv = [header, ...body]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `smhp-election-matrix-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${body.length} races`);
  }

  const matrixLoading = cyclesQuery.isLoading || contestsQuery.isLoading;
  const matrixError = cyclesQuery.error ?? contestsQuery.error;

  return (
    <>
      <PageHeader
        title="2027 Election Master Matrix"
        subtitle="Every race, candidate, party and statutory milestone in the 2027 cycle — provenance tracked"
        actions={
          <div className="flex flex-wrap items-center gap-2">

            <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button size="sm" variant="primary" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Races tracked"
          value={contestsQuery.data ? fmtNum(RACES.length) : "—"}
          caption={`${(districtsQuery.data ?? []).length} electoral districts`}
          tone="primary"
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <StatCard
          label="Registered voters"
          value={sourced.length ? `${(totalVoters / 1_000_000).toFixed(1)}M` : "—"}
          caption={sourced.length ? "Across all matrix rows" : "Not yet sourced"}
          tone="accent"
          icon={<UsersRound className="h-4 w-4" />}
        />
        <StatCard
          label="Next milestone"
          value={nextMilestone ? fmtDate(nextMilestone.scheduled_on) : "—"}
          caption={nextMilestone?.title ?? "No pending milestone"}
          tone="warning"
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <StatCard
          label="Source verification"
          value={sourcesQuery.isSuccess ? `${verifiedPct}%` : "—"}
          caption={
            sourcesQuery.isError ? "Sources unavailable for this role" : `${SOURCES.length} source records`
          }
          tone="info"
          icon={<CircleCheck className="h-4 w-4" />}
        />
      </div>

      <TabsList tabs={TABS} value={tab} onChange={setTab} />

      {/* Master Matrix */}
      <TabPanel value="matrix" active={tab === "matrix"}>
        <Panel
          title={`Races (${filtered.length})`}
          subtitle="Filter by tier, state and lifecycle status"
          bodyClassName="p-0"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => resetPage(setQuery)(e.target.value)}
                  placeholder="Search races…"
                  aria-label="Search races"
                  className="h-8 w-44 pl-8 text-xs"
                />
              </div>

              <Select
                value={tier}
                aria-label="Tier"
                onChange={(e) => resetPage(setTier)(e.target.value as Tier | "all")}
                className="h-8 w-28 text-xs"
              >
                <option value="all">All tiers</option>
                <option value="federal">Federal</option>
                <option value="state">State</option>
                <option value="local">Local</option>
              </Select>

              <Select
                value={state}
                aria-label="State"
                onChange={(e) => resetPage(setState)(e.target.value)}
                className="h-8 w-32 text-xs"
              >
                <option value="all">All states</option>
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>

              <Select
                value={status}
                aria-label="Status"
                onChange={(e) => resetPage(setStatus)(e.target.value)}
                className="h-8 w-32 text-xs capitalize"
              >
                <option value="all">Any status</option>
                {statuses.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {humanize(s)}
                  </option>
                ))}
              </Select>
            </div>
          }
        >
          {matrixLoading ? (
            <LoadingRows rows={5} />
          ) : matrixError ? (
            <ErrorState
              error={matrixError}
              onRetry={() => (cyclesQuery.isError ? cyclesQuery.refetch() : contestsQuery.refetch())}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-190 text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Race</th>
                      <th className="px-4 py-2 font-medium">Type</th>
                      <th className="px-4 py-2 font-medium">Scope</th>
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 text-right font-medium">Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/30"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{r.title}</span>
                          </div>
                          {r.incumbent && (
                            <p className="text-[11px] text-muted-foreground">
                              Incumbent: {r.incumbent}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.type.name}</td>
                        <td className="px-4 py-2.5 text-xs">{r.scope ?? "National"}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{fmtDate(r.date)}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              "rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize",
                              STATUS_TONE[r.status] ?? STATUS_FALLBACK,
                            )}
                          >
                            {humanize(r.status)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                          {r.registeredVoters == null ? "—" : fmtNum(r.registeredVoters)}
                        </td>
                      </tr>
                    ))}

                    {rows.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-10 text-center text-sm text-muted-foreground"
                        >
                          No races match these filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                <span>
                  Page {safePage + 1} of {pageCount}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={safePage === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={safePage + 1 >= pageCount}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </Panel>
      </TabPanel>

      {/* Candidates */}
      <TabPanel value="candidates" active={tab === "candidates"}>
        <Panel
          title={`Candidates (${CANDIDATES.length})`}
          subtitle="Declared aspirants and confirmed nominees"
        >
          {candidatesQuery.isLoading || matrixLoading ? (
            <LoadingRows rows={3} padded={false} />
          ) : candidatesQuery.isError ? (
            <ErrorState error={candidatesQuery.error} onRetry={() => candidatesQuery.refetch()} />
          ) : CANDIDATES.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No candidates recorded yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {CANDIDATES.map((c) => {
                const party = PARTIES.find((p) => p.id === c.election_party_id);
                const office = RACES.find((r) => r.id === c.contest_id)?.title;
                const color = party ? partyColor(party.id) : undefined;
                const homeState = unitName(c.home_state_id);
                return (
                  <div
                    key={c.id}
                    className="rounded-lg border border-border bg-secondary/25 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {office ?? "Office TBC"}
                          {homeState ? ` · ${homeState}` : ""}
                          {c.age_at_election ? ` · ${c.age_at_election}` : ""}
                        </p>
                      </div>
                      {party && (
                        <span
                          className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold"
                          style={{ backgroundColor: `${color}22`, color }}
                        >
                          {party.official_code}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </TabPanel>

      {/* Parties */}
      <TabPanel value="parties" active={tab === "parties"}>
        <Panel
          title={`Parties (${PARTIES.length})`}
          subtitle="Registered platforms contesting the 2027 cycle"
        >
          {partiesQuery.isLoading ? (
            <LoadingRows rows={3} padded={false} />
          ) : partiesQuery.isError ? (
            <ErrorState error={partiesQuery.error} onRetry={() => partiesQuery.refetch()} />
          ) : PARTIES.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No parties recorded yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {PARTIES.map((p) => {
                const color = partyColor(p.id);
                return (
                  <div key={p.id} className="rounded-lg border border-border bg-secondary/25 p-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[11px] font-bold"
                        style={{ backgroundColor: `${color}22`, color }}
                      >
                        {p.official_code}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {p.ideology ?? "Ideology TBC"}
                          {p.founded_year ? ` · est. ${p.founded_year}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <UsersRound className="h-3 w-3" />
                      {p.coverage === "national" ? "National coverage" : "Regional platform"}
                      <span className="ml-auto">
                        {CANDIDATES.filter((c) => c.election_party_id === p.id).length} candidate(s)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </TabPanel>

      {/* Lifecycle */}
      <TabPanel value="calendar" active={tab === "calendar"}>
        <Panel
          title="Statutory lifecycle"
          subtitle="Presidential cycle milestones from notice of election to declaration"
        >
          {milestonesQuery.isLoading || cyclesQuery.isLoading ? (
            <LoadingRows rows={3} padded={false} />
          ) : milestonesQuery.isError ? (
            <ErrorState error={milestonesQuery.error} onRetry={() => milestonesQuery.refetch()} />
          ) : MILESTONES.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No statutory milestones recorded yet.
            </p>
          ) : (
            <ol className="relative space-y-4 border-l border-border pl-6">
              {MILESTONES.map((m) => {
                const completed = isPast(m.scheduled_on);
                return (
                  <li key={m.id} className="relative">
                    <span className="absolute -left-7.75 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-background">
                      {completed ? (
                        <CircleCheck className="h-4 w-4 text-success" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{m.title}</p>
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          completed ? STATUS_TONE.published : STATUS_FALLBACK,
                        )}
                      >
                        {m.official_code}
                      </span>
                      <span className="ml-auto font-mono text-xs text-muted-foreground">
                        {fmtDate(m.scheduled_on)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
      </TabPanel>

      {/* Sources */}
      <TabPanel value="sources" active={tab === "sources"}>
        <Panel
          title={`Provenance ledger (${SOURCES.length})`}
          subtitle="Every matrix figure traces back to a cited source"
        >
          {sourcesQuery.isLoading ? (
            <LoadingRows rows={3} padded={false} />
          ) : sourcesQuery.isError ? (
            <ErrorState error={sourcesQuery.error} onRetry={() => sourcesQuery.refetch()} />
          ) : SOURCES.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No sources recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {SOURCES.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/25 p-3"
                >
                  <Link2 className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {s.publisher ?? "Unattributed"}
                      {s.kind ? ` · ${humanize(s.kind)}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                      REVIEW_TONE[s.status] ?? STATUS_FALLBACK,
                    )}
                  >
                    {humanize(s.status).toLowerCase()}
                  </span>
                  <button
                    type="button"
                    onClick={() => openSource(s)}
                    className="shrink-0 cursor-pointer text-[11px] font-medium text-primary hover:underline"
                  >
                    Open source
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </TabPanel>
    </>
  );
}
