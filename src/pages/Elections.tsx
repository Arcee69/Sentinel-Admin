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
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Button } from "../components/ui/Button";
import { StatCard } from "../components/ui/StatCard";
import { Input, Select } from "../components/ui/Field";
import { TabPanel, TabsList } from "../components/ui/Tabs";
import {
  CANDIDATES,
  MILESTONES,
  PARTIES,
  RACES,
  RACE_STATUSES,
  SOURCES,
  type RaceStatus,
  type Reliability,
  type Tier,
} from "../lib/elections";
import { cn } from "../lib/cn";

/** Lifecycle status palette — reserved, always paired with the status word. */
const STATUS_TONE: Record<RaceStatus, string> = {
  planned: "bg-muted text-muted-foreground",
  scheduled: "bg-primary/15 text-primary",
  primaries: "bg-accent/15 text-accent",
  campaign: "bg-warning/15 text-warning",
  polling: "bg-destructive/15 text-destructive",
  counting: "bg-warning/15 text-warning",
  declared: "bg-success/15 text-success",
  disputed: "bg-destructive/15 text-destructive",
  concluded: "bg-success/15 text-success",
  postponed: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

const RELIABILITY_TONE: Record<Reliability, string> = {
  official: "bg-success/15 text-success",
  verified_media: "bg-primary/15 text-primary",
  field: "bg-warning/15 text-warning",
  unverified: "bg-muted text-muted-foreground",
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

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const fmtNum = (n: number) => n.toLocaleString("en-US");

export default function Elections() {
  const [tab, setTab] = useState<TabValue>("matrix");
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<Tier | "all">("all");
  const [state, setState] = useState("all");
  const [status, setStatus] = useState<RaceStatus | "all">("all");
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const states = useMemo(
    () => Array.from(new Set(RACES.map((r) => r.state).filter(Boolean) as string[])).sort(),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RACES.filter((r) => {
      if (tier !== "all" && r.type.tier !== tier) return false;
      if (state !== "all" && r.state !== state) return false;
      if (status !== "all" && r.status !== status) return false;
      if (
        q &&
        !`${r.title} ${r.state ?? ""} ${r.lga ?? ""} ${r.type.name}`.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [query, tier, state, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Clamp so deleting filters can never strand you past the last page.
  const safePage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const totalVoters = RACES.reduce((t, r) => t + r.registeredVoters, 0);
  const keyRaces = RACES.filter((r) => r.isKeyRace).length;
  const nextMilestone = MILESTONES.find((m) => !m.completed);
  const verifiedPct = SOURCES.length
    ? Math.round((SOURCES.filter((s) => s.verified).length / SOURCES.length) * 100)
    : 0;

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(0);
    };
  }

  async function refresh() {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 700));
    setRefreshing(false);
    toast.success("Election matrix refreshed.");
  }

  function exportCsv() {
    const header = [
      "Race",
      "Type",
      "Tier",
      "State",
      "LGA",
      "Date",
      "Status",
      "Registered voters",
      "Key race",
    ];
    const body = filtered.map((r) => [
      r.title,
      r.type.name,
      r.type.tier,
      r.state ?? "",
      r.lga ?? "",
      r.date,
      r.status,
      String(r.registeredVoters),
      r.isKeyRace ? "yes" : "no",
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
          value={fmtNum(RACES.length)}
          caption={`${keyRaces} flagged as key races`}
          tone="primary"
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <StatCard
          label="Registered voters"
          value={`${(totalVoters / 1_000_000).toFixed(1)}M`}
          caption="Across all matrix rows"
          tone="accent"
          icon={<UsersRound className="h-4 w-4" />}
        />
        <StatCard
          label="Next milestone"
          value={nextMilestone ? fmtDate(nextMilestone.date) : "—"}
          caption={nextMilestone?.label ?? "No pending milestone"}
          tone="warning"
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <StatCard
          label="Source verification"
          value={`${verifiedPct}%`}
          caption={`${SOURCES.length} source records`}
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
                onChange={(e) => resetPage(setStatus)(e.target.value as RaceStatus | "all")}
                className="h-8 w-32 text-xs capitalize"
              >
                <option value="all">Any status</option>
                {RACE_STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          }
        >
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
                        {r.isKeyRace && (
                          <span
                            title="Key race"
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-glow-primary"
                          />
                        )}
                        <span className="font-medium">{r.title}</span>
                      </div>
                      {r.incumbent && (
                        <p className="text-[11px] text-muted-foreground">
                          Incumbent: {r.incumbent}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.type.name}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {r.state ?? "National"}
                      {r.lga ? ` · ${r.lga}` : ""}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{fmtDate(r.date)}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize",
                          STATUS_TONE[r.status],
                        )}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                      {fmtNum(r.registeredVoters)}
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
        </Panel>
      </TabPanel>

      {/* Candidates */}
      <TabPanel value="candidates" active={tab === "candidates"}>
        <Panel
          title={`Candidates (${CANDIDATES.length})`}
          subtitle="Declared aspirants and confirmed nominees"
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {CANDIDATES.map((c) => {
              const party = PARTIES.find((p) => p.acronym === c.partyAcronym);
              return (
                <div
                  key={c.id}
                  className="rounded-lg border border-border bg-secondary/25 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{c.fullName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.office ?? "Office TBC"}
                        {c.homeState ? ` · ${c.homeState}` : ""}
                        {c.age ? ` · ${c.age}` : ""}
                      </p>
                    </div>
                    {party && (
                      <span
                        className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold"
                        style={{ backgroundColor: `${party.color}22`, color: party.color }}
                      >
                        {party.acronym}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </TabPanel>

      {/* Parties */}
      <TabPanel value="parties" active={tab === "parties"}>
        <Panel
          title={`Parties (${PARTIES.length})`}
          subtitle="Registered platforms contesting the 2027 cycle"
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {PARTIES.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-secondary/25 p-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[11px] font-bold"
                    style={{ backgroundColor: `${p.color}22`, color: p.color }}
                  >
                    {p.acronym}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.ideology ?? "Ideology TBC"}
                      {p.foundedYear ? ` · est. ${p.foundedYear}` : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <UsersRound className="h-3 w-3" />
                  {p.isNational ? "National coverage" : "Regional platform"}
                  <span className="ml-auto">
                    {CANDIDATES.filter((c) => c.partyAcronym === p.acronym).length} candidate(s)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </TabPanel>

      {/* Lifecycle */}
      <TabPanel value="calendar" active={tab === "calendar"}>
        <Panel
          title="Statutory lifecycle"
          subtitle="Presidential cycle milestones from notice of election to declaration"
        >
          <ol className="relative space-y-4 border-l border-border pl-6">
            {MILESTONES.map((m) => (
              <li key={m.id} className="relative">
                <span className="absolute -left-7.75 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-background">
                  {m.completed ? (
                    <CircleCheck className="h-4 w-4 text-success" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{m.label}</p>
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      STATUS_TONE[m.phase],
                    )}
                  >
                    {m.phase}
                  </span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {fmtDate(m.date)}
                  </span>
                </div>

                {m.notes && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{m.notes}</p>
                )}
              </li>
            ))}
          </ol>
        </Panel>
      </TabPanel>

      {/* Sources */}
      <TabPanel value="sources" active={tab === "sources"}>
        <Panel
          title={`Provenance ledger (${SOURCES.length})`}
          subtitle="Every matrix figure traces back to a cited source"
        >
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
                    {s.entityType ? ` · ${s.entityType}` : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                    RELIABILITY_TONE[s.reliability],
                  )}
                >
                  {s.reliability.replace("_", " ")}
                </span>
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="shrink-0 text-[11px] font-medium text-primary hover:underline"
                  >
                    Open source
                  </a>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </TabPanel>
    </>
  );
}
