import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, LogOut, Menu, Search, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useFilters } from "../context/FilterContext";
import { useCampaignAlerts } from "../hooks/api/useDashboard";
import { useUnitNames } from "../hooks/useUnitNames";
import { describeAlert, sortAlerts } from "../lib/alerts";
import { relativeTime } from "../lib/format";
import { FilterMenu } from "./FilterMenu";
import { Avatar } from "./ui/Avatar";
import { cn } from "../lib/cn";

/** Picker value for "no state selected". */
const WHOLE_CAMPAIGN = "__campaign__";

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { user, signOut } = useAuth();
  const { apiCampaign, campaigns, setCampaign, stateUnits, scopeUnit, scopeLabel, setScopeUnit } =
    useFilters();
  const alertsQuery = useCampaignAlerts(apiCampaign?.id);
  const unitName = useUnitNames();
  const alerts = sortAlerts(alertsQuery.data?.items ?? []);
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setNotifOpen(false);
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-x-3 border-b border-border bg-background/85 px-4 pb-2 backdrop-blur-xl sm:flex-nowrap sm:px-6 sm:pb-0">
      <button
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="cursor-pointer rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Live indicator + campaign / scope filters */}
      <span className="hidden items-center gap-1.5 sm:inline-flex">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ticker rounded-full bg-success opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        <span className="hidden text-[10px] font-bold uppercase tracking-wider text-success xl:inline">
          Live
        </span>
      </span>

      {/* Wraps to its own row on narrow screens so the header never overflows. */}
      <div className="order-last flex w-full min-w-0 items-center gap-2 sm:order-none sm:w-auto">
        <FilterMenu
          caption="Campaign"
          value={apiCampaign?.id ?? ""}
          valueLabel={apiCampaign?.name ?? "No campaign"}
          onChange={setCampaign}
          searchable={campaigns.length > 8}
          options={campaigns.map((c) => ({
            value: c.id,
            label: c.name,
            hint: [c.party, c.cycle, c.office].filter(Boolean).join(" · "),
          }))}
        />

        <FilterMenu
          caption="Scope"
          value={scopeUnit?.id ?? WHOLE_CAMPAIGN}
          valueLabel={scopeLabel}
          onChange={(v) => setScopeUnit(v === WHOLE_CAMPAIGN ? null : v)}
          searchable={stateUnits.length > 8}
          options={[
            {
              value: WHOLE_CAMPAIGN,
              label: "All States",
              hint: `${stateUnits.length} state${stateUnits.length === 1 ? "" : "s"} in this campaign`,
            },
            ...stateUnits.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
      </div>

      {/* Search */}
      <div className="relative ml-auto hidden max-w-xs flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search agents, wards, polling units…"
          className="h-9.5 w-full rounded-lg border border-border bg-input/50 pl-9 pr-14 text-sm placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-ring/25"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <div ref={wrapRef} className="ml-auto flex items-center gap-1.5">

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              setMenuOpen(false);
            }}
            aria-label="Notifications"
            className="relative cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
              {alerts.length}
            </span>
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 animate-rise-in overflow-hidden rounded-xl border border-border bg-popover shadow-elevated">
              <div className="border-b border-border px-4 py-2.5">
                <p className="text-xs font-semibold">Critical alerts</p>
                <p className="text-[10px] text-muted-foreground">Auto-flagged by Sentinel AI</p>
              </div>
              <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                {alertsQuery.isLoading && (
                  <li className="px-4 py-6 text-center text-[11px] text-muted-foreground">
                    Loading alerts…
                  </li>
                )}
                {alertsQuery.isError && (
                  <li className="px-4 py-6 text-center text-[11px] text-destructive">
                    Couldn't load alerts.
                  </li>
                )}
                {alertsQuery.isSuccess && alerts.length === 0 && (
                  <li className="px-4 py-6 text-center text-[11px] text-muted-foreground">
                    No open alerts.
                  </li>
                )}
                {alerts.map((a) => {
                  const d = describeAlert(a, unitName(a.geographic_unit_id));
                  return (
                    <li
                      key={`${a.type}:${a.target_id}`}
                      className="flex gap-2.5 px-4 py-3 hover:bg-secondary/40"
                    >
                      <span
                        className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", d.severity.dot)}
                      />
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium leading-snug">{d.title}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{d.detail}</p>
                      </div>
                      <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                        {relativeTime(a.occurred_at)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Account */}
        <div className="relative">
          <button
            onClick={() => {
              setMenuOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-secondary"
          >
            <Avatar initials={user?.initials ?? "?"} className="h-8 w-8" />
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-[12px] font-semibold">{user?.name}</span>
              <span className="block text-[10px] text-muted-foreground">{user?.role}</span>
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 animate-rise-in overflow-hidden rounded-xl border border-border bg-popover shadow-elevated">
              <div className="border-b border-border px-4 py-3">
                <p className="text-[12px] font-semibold">{user?.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                Encrypted session · audit-logged
              </div>
              <button
                onClick={() => {
                  signOut();
                  navigate("/");
                }}
                className="flex w-full cursor-pointer items-center gap-2 border-t border-border px-4 py-2.5 text-left text-[12px] text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
