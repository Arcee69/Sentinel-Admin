import { useMemo, useState } from "react";
import { Ban, Eye, FlaskConical, Pencil, RotateCcw } from "lucide-react";
import { Panel } from "../ui/Panel";
import { Button } from "../ui/Button";
import { Select } from "../ui/Field";
import { STATE_OPTIONS, type CampaignRecord } from "./model";
import {
  ACCESS_LABELS,
  ACTIVITY_STREAM,
  DATA_ACCESS_LEVELS,
  DATA_AREAS,
  FIELD_REPORTS,
  INCIDENTS,
  LIVE_CAMPAIGNS,
  PLATFORM_ROLES,
  POLLING_UNITS,
  ROLE_LABELS,
  ROLE_POLICIES,
  SCOPE_LABELS,
  TASKS,
  type AccessRule,
  type DataAccess,
  type DataAreaKey,
  type DataScope,
  type PlatformRole,
} from "../../lib/data";
import { cn } from "../../lib/cn";

/** Records behind each data area. Areas without a dataset show the scope label instead of counts. */
const AREA_RECORDS: Partial<Record<DataAreaKey, { state: string | null }[]>> = {
  campaign_activities: ACTIVITY_STREAM,
  incidents: INCIDENTS,
  field_reports: FIELD_REPORTS,
  field_tasks: TASKS,
  polling_units: POLLING_UNITS,
  broadcasts: LIVE_CAMPAIGNS,
};

/** Roles whose reach is bounded by their assigned state. */
const isStateBound = (role: PlatformRole) => role === "state_coordinator" || role === "field_agent";

const selectClass = "h-8 text-xs";

export function PermissionSimulator({ campaigns }: { campaigns: CampaignRecord[] }) {
  const [role, setRole] = useState<PlatformRole>("state_coordinator");
  const [state, setState] = useState("Lagos");
  const [campaignId, setCampaignId] = useState("");
  const [proposed, setProposed] = useState(() => structuredClone(ROLE_POLICIES));

  const counts = useMemo(() => {
    const out: Partial<Record<DataAreaKey, { total: number; inState: number }>> = {};
    for (const [key, rows] of Object.entries(AREA_RECORDS) as [DataAreaKey, { state: string | null }[]][]) {
      out[key] = { total: rows.length, inState: rows.filter((r) => r.state === state).length };
    }
    return out;
  }, [state]);

  const campaign = campaigns.find((c) => c.id === campaignId);
  const outOfScope = !!campaign?.states && isStateBound(role) && !campaign.states.includes(state);

  const changeCount = DATA_AREAS.filter((a) => isChanged(ROLE_POLICIES[role][a.key], proposed[role][a.key])).length;

  function propose(key: DataAreaKey, patch: Partial<AccessRule>) {
    setProposed((p) => ({ ...p, [role]: { ...p[role], [key]: { ...p[role][key], ...patch } } }));
  }

  function reach(key: DataAreaKey, rule: AccessRule): string {
    if (rule.access === "none") return "—";
    const c = counts[key];
    if (!c) return rule.scope === "all" ? "All" : SCOPE_LABELS[rule.scope];
    if (rule.scope === "all") return `${c.total} records`;
    if (rule.scope === "state") return `${c.inState} of ${c.total}`;
    return `own only (≤ ${c.inState})`;
  }

  const lockedRole = role === "national_admin";

  return (
    <Panel
      title="Permission Simulator"
      subtitle="Preview what a role can reach before changing policy"
      icon={<FlaskConical className="h-4 w-4" />}
    >
      <p className="mb-3 text-xs text-muted-foreground">
        Preview what a role sees for a given state and campaign. Adjust the "Proposed" column to
        compare before changing policy — nothing is saved.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          aria-label="Role"
          className={selectClass}
          value={role}
          onChange={(e) => setRole(e.target.value as PlatformRole)}
        >
          {PLATFORM_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
        <Select
          aria-label="State"
          className={selectClass}
          value={state}
          onChange={(e) => setState(e.target.value)}
          disabled={!isStateBound(role)}
        >
          {STATE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Campaign"
          className={selectClass}
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
        >
          <option value="">All campaigns</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.states ? c.scopeLabel : "National"})
            </option>
          ))}
        </Select>

        <span className="ml-auto text-xs text-muted-foreground">
          {changeCount} proposed change{changeCount === 1 ? "" : "s"}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setProposed((p) => ({ ...p, [role]: structuredClone(ROLE_POLICIES[role]) }))}
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </div>

      {campaign && (
        <div
          className={cn(
            "mb-3 rounded-lg border px-3 py-2 text-xs",
            outOfScope ? "border-destructive/50 text-destructive" : "border-border text-muted-foreground",
          )}
        >
          {outOfScope
            ? `${ROLE_LABELS[role]} in ${state} would see "${campaign.name}" listed but cannot act on it — it is scoped to ${campaign.scopeLabel}.`
            : `${ROLE_LABELS[role]} can work within "${campaign.name}" (${campaign.states ? campaign.scopeLabel : "national"}).`}
        </div>
      )}

      <div className="-mx-4 overflow-x-auto sm:-mx-5">
        <table className="w-full min-w-160 text-left text-[13px]">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 font-medium sm:px-5">Data area</th>
              <th className="px-3 py-2.5 font-medium">Current</th>
              <th className="px-3 py-2.5 font-medium">Reach</th>
              <th className="px-3 py-2.5 font-medium">Proposed</th>
              <th className="px-3 py-2.5 font-medium sm:pr-5">Proposed reach</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {DATA_AREAS.map((area) => {
              const now = ROLE_POLICIES[role][area.key];
              const next = proposed[role][area.key];
              const changed = isChanged(now, next);

              return (
                <tr key={area.key} className={cn("transition-colors", changed ? "bg-primary/5" : "hover:bg-secondary/30")}>
                  <td className="px-4 py-2 text-xs sm:px-5">{area.label}</td>
                  <td className="px-3 py-2">
                    <AccessTag access={now.access} />
                    {now.access !== "none" && (
                      <div className="text-[10px] text-muted-foreground">{SCOPE_LABELS[now.scope]}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{reach(area.key, now)}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex gap-1">
                      <Select
                        aria-label={`Proposed access for ${area.label}`}
                        className={selectClass}
                        disabled={lockedRole}
                        value={next.access}
                        onChange={(e) => propose(area.key, { access: e.target.value as DataAccess })}
                      >
                        {DATA_ACCESS_LEVELS.map((a) => (
                          <option key={a} value={a}>
                            {ACCESS_LABELS[a]}
                          </option>
                        ))}
                      </Select>
                      <Select
                        aria-label={`Proposed scope for ${area.label}`}
                        className={selectClass}
                        disabled={lockedRole || next.access === "none"}
                        value={next.scope}
                        onChange={(e) => propose(area.key, { scope: e.target.value as DataScope })}
                      >
                        {(Object.keys(SCOPE_LABELS) as DataScope[]).map((s) => (
                          <option key={s} value={s}>
                            {SCOPE_LABELS[s]}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </td>
                  <td className={cn("px-3 py-2 text-xs sm:pr-5", changed ? "text-primary" : "text-muted-foreground")}>
                    {reach(area.key, next)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[10px] text-muted-foreground">
        Campaign data (campaigns, activities, incidents, endorsements, defections, signals, party
        activities, campaign field reports) is enforced by the server: coordinators and agents only
        read their assigned state plus national items; only admins and same-state coordinators can
        change it.
      </p>
    </Panel>
  );
}

function isChanged(a: AccessRule, b: AccessRule) {
  return a.access !== b.access || a.scope !== b.scope;
}

function AccessTag({ access }: { access: DataAccess }) {
  const Icon = access === "edit" ? Pencil : access === "view" ? Eye : Ban;
  const tone =
    access === "edit" ? "text-primary" : access === "view" ? "text-foreground" : "text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", tone)}>
      <Icon className="h-3 w-3" />
      {ACCESS_LABELS[access]}
    </span>
  );
}
