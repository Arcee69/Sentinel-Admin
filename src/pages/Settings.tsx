import { useState } from "react";
import { Bell, Check, KeyRound, Minus } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Toggle } from "../components/ui/Toggle";
import { CampaignSetup } from "../components/settings/CampaignSetup";
import { PermissionSimulator } from "../components/settings/PermissionSimulator";
import { UsersPanel } from "../components/settings/UsersPanel";
import { toRecord, type CampaignRecord } from "../components/settings/model";
import { NOTIFICATION_PREFS, PERMISSIONS, ROLE_LABELS } from "../lib/data";
import { CAMPAIGNS } from "../lib/campaigns";
import { useAuth } from "../context/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === ROLE_LABELS.national_admin;

  const [prefs, setPrefs] = useState(NOTIFICATION_PREFS);
  // No campaigns API yet — created and edited campaigns live for the session.
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>(() => CAMPAIGNS.map(toRecord));

  function toggle(id: string, next: boolean) {
    setPrefs((p) => p.map((n) => (n.id === id ? { ...n, on: next } : n)));
  }

  function saveCampaign(record: CampaignRecord, isNew: boolean) {
    setCampaigns((list) =>
      isNew ? [record, ...list] : list.map((c) => (c.id === record.id ? record : c)),
    );
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Platform configuration" />

      <div className="grid items-start gap-5 lg:grid-cols-12">
        <CampaignSetup
          campaigns={campaigns}
          onSave={saveCampaign}
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
            {prefs.map((n) => (
              <li
                key={n.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-secondary/25 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{n.label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{n.detail}</p>
                </div>
                <Toggle
                  checked={n.on}
                  onChange={(next) => toggle(n.id, next)}
                  label={n.label}
                />
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
