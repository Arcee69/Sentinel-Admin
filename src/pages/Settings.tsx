import { useState } from "react";
import { toast } from "sonner";
import { Bell, Check, Flag, KeyRound, Minus, Plus } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Toggle } from "../components/ui/Toggle";
import { NOTIFICATION_PREFS, PERMISSIONS } from "../lib/data";
import { CAMPAIGNS } from "../lib/campaigns";
import { useFilters } from "../context/FilterContext";

export default function SettingsPage() {
  const [prefs, setPrefs] = useState(NOTIFICATION_PREFS);
  const { campaignId, setCampaign } = useFilters();

  function toggle(id: string, next: boolean) {
    setPrefs((p) => p.map((n) => (n.id === id ? { ...n, on: next } : n)));
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Platform configuration" />

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Panel
          title="Campaign Setup"
          subtitle="Campaigns this account can command"
          icon={<Flag className="h-4 w-4" />}
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {CAMPAIGNS.map((c) => {
              const active = c.id === campaignId;
              return (
                <li
                  key={c.id}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/30 sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13px] font-semibold">{c.name}</p>
                      {active && (
                        <Badge tone="success" dot>
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {c.party} · {c.cycle} · {c.scopeLabel}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={active ? "outline" : "subtle"}
                    disabled={active}
                    onClick={() => {
                      setCampaign(c.id);
                      toast.success(`Switched command to "${c.name}".`);
                    }}
                  >
                    {active ? "Current" : "Activate"}
                  </Button>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-border p-4 sm:p-5">
            <Button
              variant="subtle"
              className="w-full"
              onClick={() => toast.info("Campaign creation is not wired to an API yet.")}
            >
              <Plus className="h-4 w-4" />
              Create New Campaign
            </Button>
          </div>
        </Panel>

        <Panel
          title="Role Permissions"
          subtitle="Who can do what"
          icon={<KeyRound className="h-4 w-4" />}
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium sm:px-5">Capability</th>
                  <th className="px-3 py-2.5 text-center font-medium">Admin</th>
                  <th className="px-3 py-2.5 text-center font-medium">State</th>
                  <th className="px-3 py-2.5 text-center font-medium sm:px-5">Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PERMISSIONS.map((p) => (
                  <tr key={p.capability} className="transition-colors hover:bg-secondary/30">
                    <td className="px-4 py-2.5 sm:px-5">{p.capability}</td>
                    <Cell allowed={p.admin} />
                    <Cell allowed={p.state} />
                    <Cell allowed={p.agent} last />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel
        title="Notifications"
        subtitle="What Sentinel pushes to you"
        icon={<Bell className="h-4 w-4" />}
      >
        <ul className="grid gap-2.5 sm:grid-cols-2">
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
