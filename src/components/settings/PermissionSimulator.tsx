import { useMemo, useState } from "react";
import { Ban, Eye, FlaskConical, Pencil, RotateCcw } from "lucide-react";
import { Panel } from "../ui/Panel";
import { Button } from "../ui/Button";
import { Select } from "../ui/Field";
import {
  ACCESS_LABELS,
  DATA_ACCESS_LEVELS,
  DATA_AREAS,
  PLATFORM_ROLES,
  ROLE_LABELS,
  ROLE_POLICIES,
  SCOPE_LABELS,
  type AccessRule,
  type DataAccess,
  type DataAreaKey,
  type DataScope,
  type PlatformRole,
} from "../../lib/data";
import { useFilters } from "../../context/FilterContext";
import { useActivityFeed } from "../../hooks/api/useDashboard";
import { useFieldReports, useTasksQuery } from "../../hooks/api/useOperations";
import { useIncidents } from "../../hooks/api/useCommand";
import { useBroadcasts } from "../../hooks/api/useCommunications";
import { useRegisterEntries, useRegisterVersions } from "../../hooks/api/useParticipation";
import { useUnitLineage } from "../../hooks/useUnitNames";
import type { Campaign } from "../../services/settings";
import { cn } from "../../lib/cn";

/** Roles whose reach is bounded by their assigned state. */
const isStateBound = (role: PlatformRole) => role === "state_coordinator" || role === "field_agent";

const selectClass = "h-8 text-xs";

/**
 * The real records behind each data area, as the units they belong to.
 * `null` is a record with no place (national); everything else is placed
 * in a state through the geography hierarchy.
 */
function useAreaRecords(): Partial<Record<DataAreaKey, (string | null)[]>> & { unitIds: string[] } {
  const { apiCampaign } = useFilters();
  const campaignId = apiCampaign?.id;
  const activity = useActivityFeed(campaignId);
  const incidents = useIncidents(campaignId);
  const reports = useFieldReports(campaignId);
  const tasks = useTasksQuery(campaignId);
  const broadcasts = useBroadcasts(campaignId);
  const versions = useRegisterVersions();
  const version = (versions.data ?? []).find((v) => v.status === "published");
  const entries = useRegisterEntries(version?.id);

  return useMemo(() => {
    const areas = {
      campaign_activities: (activity.data?.pages ?? [])
        .flatMap((p) => p.items)
        .map((e) => e.geographic_unit_id),
      incidents: (incidents.data ?? []).map((i) => i.geographic_unit_id),
      field_reports: (reports.data ?? []).map((r) => r.geographic_unit_id),
      field_tasks: (tasks.data ?? []).map((t) => t.geographic_unit_id),
      polling_units: (entries.data?.entries ?? []).map((e) => e.polling_unit_id),
      broadcasts: (broadcasts.data ?? []).map((b) => b.target_state_id),
    };
    const unitIds = [
      ...new Set(Object.values(areas).flat().filter((id): id is string => !!id)),
    ];
    return { ...areas, unitIds };
  }, [activity.data, incidents.data, reports.data, tasks.data, broadcasts.data, entries.data]);
}

export function PermissionSimulator({ campaigns }: { campaigns: Campaign[] }) {
  const { stateUnits, rootUnits } = useFilters();
  const [role, setRole] = useState<PlatformRole>("state_coordinator");
  const [stateChoice, setState] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [proposed, setProposed] = useState(() => structuredClone(ROLE_POLICIES));

  const state = stateChoice || stateUnits[0]?.id || "";
  const stateName = stateUnits.find((s) => s.id === state)?.name ?? "the selected state";
  const records = useAreaRecords();
  const lineage = useUnitLineage(records.unitIds);

  const counts = useMemo(() => {
    const out: Partial<Record<DataAreaKey, { total: number; inState: number }>> = {};
    for (const area of DATA_AREAS) {
      const units = records[area.key];
      if (!units) continue;
      out[area.key] = {
        total: units.length,
        inState: units.filter((id) => id && lineage(id)?.state?.id === state).length,
      };
    }
    return out;
  }, [records, lineage, state]);

  const rootIds = new Set(rootUnits.map((r) => r.id));
  const campaign = campaigns.find((c) => c.id === campaignId);
  const national = !campaign || campaign.scope_unit_ids.some((id) => rootIds.has(id));
  const campaignScope = national
    ? "national"
    : campaign.scope_unit_ids
        .map((id) => stateUnits.find((s) => s.id === id)?.name)
        .filter(Boolean)
        .join(", ") || "its own areas";
  const outOfScope =
    !!campaign && !national && isStateBound(role) && !campaign.scope_unit_ids.includes(state);

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
          {stateUnits.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
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
              {c.name} (
              {c.scope_unit_ids.some((id) => rootIds.has(id))
                ? "National"
                : c.scope_unit_ids
                    .map((id) => stateUnits.find((s) => s.id === id)?.name)
                    .filter(Boolean)
                    .join(", ") || "Scoped"}
              )
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
            ? `${ROLE_LABELS[role]} in ${stateName} would see "${campaign.name}" listed but cannot act on it — it is scoped to ${campaignScope}.`
            : `${ROLE_LABELS[role]} can work within "${campaign.name}" (${campaignScope}).`}
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
