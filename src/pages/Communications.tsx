import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Image as ImageIcon,
  MessageSquare,
  Paperclip,
  Radar,
  Send,
  Share2,
  Signal,
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Badge, type BadgeTone } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Label, Select, Textarea } from "../components/ui/Field";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { StatCard } from "../components/ui/StatCard";
import { Meter } from "../components/ui/Meter";
import { AUDIENCES, CHANNELS, type CampaignStatus } from "../lib/data";
import { useScopedData } from "../hooks/useScopedData";
import { useFilters } from "../context/FilterContext";

const CHANNEL_OPTIONS = ["WhatsApp", "Telegram", "SMS"] as const;

const STATUS_TONE: Record<CampaignStatus, BadgeTone> = {
  Viral: "destructive",
  Delivered: "success",
  Sent: "info",
  Draft: "muted",
};

const CHANNEL_TONE = {
  accent: "bg-accent/12 text-accent",
  info: "bg-info/12 text-info",
  warning: "bg-warning/12 text-warning",
} as const;

export default function Communications() {
  const [channel, setChannel] = useState<(typeof CHANNEL_OPTIONS)[number]>("WhatsApp");
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]>("All");
  const { availableStates, scope, isNationwide } = useFilters();
  const { liveCampaigns, scopeLabel } = useScopedData();
  // Targeting defaults to the active scope so composing respects the filter.
  const [state, setState] = useState(isNationwide ? "All" : scope);
  const [body, setBody] = useState("");

  // The reference dashboard ticks its live counters; mirror that here.
  const [reach, setReach] = useState(640_000);
  const [shares, setShares] = useState(27_700);

  useEffect(() => {
    const id = setInterval(() => {
      setReach((r) => r + Math.floor(Math.random() * 900) + 200);
      setShares((s) => s + Math.floor(Math.random() * 60) + 10);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  function dispatch() {
    if (!body.trim()) {
      toast.error("Write a message before dispatching.");
      return;
    }
    toast.success(`Queued to ${channel} · ${audience} · ${state}`);
    setBody("");
  }

  return (
    <>
      <PageHeader
        title="Communications"
        subtitle={`Multi-channel campaign reach · ${scopeLabel}`}
        actions={
          <Badge tone="success" dot>
            Engine live
          </Badge>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total Reach"
          value={`${(reach / 1_000_000).toFixed(2)}M`}
          caption="↑ live counter"
          tone="primary"
          icon={<Radar className="h-4 w-4" />}
        />
        <StatCard
          label="Engagement"
          value="29.4%"
          caption="avg across active"
          tone="accent"
          icon={<Signal className="h-4 w-4" />}
        />
        <StatCard
          label="Shares"
          value={shares.toLocaleString()}
          caption="+82 last min"
          tone="warning"
          icon={<Share2 className="h-4 w-4" />}
        />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[1fr_1.2fr]">
        <div className="space-y-5">
          <Panel
            title="Compose Message"
            subtitle="Targeted, multi-channel"
            icon={<MessageSquare className="h-4 w-4" />}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Channel</Label>
                <SegmentedControl
                  options={CHANNEL_OPTIONS}
                  value={channel}
                  onChange={setChannel}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="audience">Audience</Label>
                  <Select
                    id="audience"
                    className="w-full"
                    value={audience}
                    onChange={(e) =>
                      setAudience(e.target.value as (typeof AUDIENCES)[number])
                    }
                  >
                    {AUDIENCES.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State</Label>
                  <Select
                    id="state"
                    className="w-full"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  >
                    {["All", ...availableStates].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write the campaign message…"
                />
                <p className="text-right font-mono text-[10px] text-muted-foreground">
                  {body.length} / 640
                </p>
              </div>

              <button
                type="button"
                onClick={() => toast.info("Media picker is not wired up in the demo.")}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Attach media (image / video)
                <ImageIcon className="ml-auto h-3.5 w-3.5" />
              </button>

              <Button variant="primary" size="lg" className="w-full" onClick={dispatch}>
                <Send className="h-4 w-4" />
                Dispatch Campaign
              </Button>
            </div>
          </Panel>

          <Panel title="Communications Channels" subtitle="Capacity across the network">
            <ul className="space-y-3">
              {CHANNELS.map((c) => (
                <li
                  key={c.name}
                  className="flex items-center gap-3 rounded-lg border border-border bg-secondary/25 p-3"
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${CHANNEL_TONE[c.tone]}`}
                  >
                    <Signal className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">{c.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {c.active.toLocaleString()} active · {c.reach} reach
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel
          title="Live Campaigns"
          subtitle="Reach updates every 3s"
          icon={<Radar className="h-4 w-4" />}
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {liveCampaigns.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                No campaigns targeting {scopeLabel}.
              </li>
            )}
            {liveCampaigns.map((c) => (
              <li key={c.id} className="px-4 py-4 transition-colors hover:bg-secondary/30 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">{c.title}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {c.channel} · {c.audience} · {c.state} · {c.sent}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[c.status]} dot={c.status === "Viral"}>
                    {c.status}
                  </Badge>
                </div>

                <p className="mt-2 truncate text-[12px] text-muted-foreground">{c.preview}</p>

                <dl className="mt-3 grid grid-cols-3 gap-3">
                  <Stat label="Reach" value={`${(c.reach / 1000).toFixed(1)}k`} />
                  <Stat label="Engage" value={`${c.engagement}%`} />
                  <Stat label="Shares" value={c.shares.toLocaleString()} />
                </dl>

                <Meter
                  value={c.engagement}
                  max={40}
                  className="mt-3"
                  color="var(--color-chart-2)"
                />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/30 px-2.5 py-1.5">
      <dd className="font-mono text-[13px] font-semibold tabular-nums">{value}</dd>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
    </div>
  );
}
