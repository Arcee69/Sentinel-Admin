import { toast } from "sonner";
import { Bell, Check, KeyRound, Minus } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Toggle } from "../components/ui/Toggle";
import { CampaignSetup } from "../components/settings/CampaignSetup";
import { PermissionSimulator } from "../components/settings/PermissionSimulator";
import { UsersPanel } from "../components/settings/UsersPanel";
import { PERMISSIONS, ROLE_LABELS } from "../lib/data";
import { useAuth } from "../context/AuthContext";
import { useFilters } from "../context/FilterContext";
import { useOrgCampaigns, useUpdateNotificationPreferences } from "../hooks/api/useSettings";
import { errorMessage } from "../services/errors";
import type { NotificationPreferences } from "../services/auth";

/** Preferences the API stores, with the copy each toggle shows. */
const LIVE_PREFS: { key: keyof NotificationPreferences; label: string; detail: string }[] = [
  {
    key: "incidents",
    label: "Critical incident alerts",
    detail: "Incidents raised in your campaigns",
  },
  {
    key: "assignments",
    label: "Assignment updates",
    detail: "Tasks and assignments that involve you",
  },
  {
    key: "campaign_messages",
    label: "Campaign messages",
    detail: "In-app notices from your campaign",
  },
];

/** Shown so the roadmap is visible, but there's no API to save them yet. */
const UNAVAILABLE_PREFS = [
  { id: "sentiment", label: "Sentiment dip warnings", detail: "When net sentiment drops 5+ pts" },
  { id: "idle", label: "Agent idle alerts", detail: "No activity for over 4 hours" },
  { id: "summary", label: "Daily executive summary", detail: "Delivered 07:00 WAT" },
];

export default function SettingsPage() {
  const { access, apiUser, activeOrganization } = useAuth();
  const { campaigns: workspace } = useFilters();
  const isAdmin = access?.role === "admin";

  const orgCampaigns = useOrgCampaigns(activeOrganization?.organization.id);
  // Fall back to the session's campaigns if the organization list is refused.
  const campaigns = orgCampaigns.data ?? (orgCampaigns.isError ? workspace : []);

  const savePrefs = useUpdateNotificationPreferences();
  const prefs = apiUser?.notification_preferences;

  function toggle(key: keyof NotificationPreferences, next: boolean) {
    savePrefs.mutate(
      { [key]: next },
      {
        onSuccess: () => toast.success("Notification preference saved"),
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Platform configuration" />

      <div className="grid items-start gap-5 lg:grid-cols-12">
        <CampaignSetup
          campaigns={campaigns}
          isLoading={orgCampaigns.isLoading}
          isAdmin={isAdmin}
          className="lg:col-span-7"
        />

        <Panel
          title="Role Permissions"
          subtitle="Who can do what"
          icon={<KeyRound className="h-4 w-4" />}
          className="lg:col-span-5"
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-115 text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium sm:px-5">Capability</th>
                  <th className="px-3 py-2.5 text-center font-medium">Admin</th>
                  <th className="px-3 py-2.5 text-center font-medium">State</th>
                  <th className="px-3 py-2.5 text-center font-medium">Agent</th>
                  <th
                    className="px-3 py-2.5 text-center font-medium sm:px-5"
                    title={ROLE_LABELS.observer}
                  >
                    Obs.
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PERMISSIONS.map((p) => (
                  <tr key={p.capability} className="transition-colors hover:bg-secondary/30">
                    <td className="px-4 py-2.5 sm:px-5">{p.capability}</td>
                    <Cell allowed={p.admin} />
                    <Cell allowed={p.state} />
                    <Cell allowed={p.agent} />
                    <Cell allowed={p.observer} last />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {isAdmin && (
          <div className="min-w-0 lg:col-span-12">
            <PermissionSimulator campaigns={campaigns} />
          </div>
        )}

        {isAdmin && (
          <div className="min-w-0 lg:col-span-12">
            <UsersPanel />
          </div>
        )}

        <Panel
          title="Notifications"
          subtitle="What Sentinel pushes to you"
          icon={<Bell className="h-4 w-4" />}
          className="lg:col-span-12"
        >
          <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {LIVE_PREFS.map((n) => (
              <li
                key={n.key}
                className="flex items-center gap-3 rounded-lg border border-border bg-secondary/25 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{n.label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{n.detail}</p>
                </div>
                <Toggle
                  checked={!!prefs?.[n.key]}
                  onChange={(next) => toggle(n.key, next)}
                  label={n.label}
                  disabled={!prefs || (savePrefs.isPending && n.key in (savePrefs.variables ?? {}))}
                />
              </li>
            ))}
            {UNAVAILABLE_PREFS.map((n) => (
              <li
                key={n.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-secondary/25 p-3 opacity-70"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{n.label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {n.detail} · Not available yet
                  </p>
                </div>
                <Toggle checked={false} onChange={() => undefined} label={n.label} disabled />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function Cell({ allowed, last = false }: { allowed: boolean; last?: boolean }) {
  return (
    <td className={`px-3 py-2.5 text-center ${last ? "sm:px-5" : ""}`}>
      {allowed ? (
        <Check className="mx-auto h-4 w-4 text-success" aria-label="allowed" />
      ) : (
        <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" aria-label="not allowed" />
      )}
    </td>
  );
}
