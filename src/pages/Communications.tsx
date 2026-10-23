import { useState } from "react";
import { toast } from "sonner";
import {
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  Radar,
  Save,
  Send,
  Share2,
  Signal,
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Badge, type BadgeTone } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input, Label, Select, Textarea } from "../components/ui/Field";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { StatCard } from "../components/ui/StatCard";
import { Meter } from "../components/ui/Meter";
import { ErrorState, LoadingRows } from "../components/ui/AsyncState";
import { AUDIENCES, CHANNELS, type CampaignStatus } from "../lib/data";
import { useFilters } from "../context/FilterContext";
import { useAuth } from "../context/AuthContext";
import {
  useBroadcasts,
  useCreateBroadcast,
  usePublishBroadcast,
} from "../hooks/api/useCommunications";
import { useUnitNames } from "../hooks/useUnitNames";
import { useNow } from "../hooks/useNow";
import { relativeTime } from "../lib/format";
import { errorMessage, toApiError, type FieldErrors } from "../services/errors";
import type { Broadcast, BroadcastChannel } from "../services/communications";

const CHANNEL_OPTIONS = ["In-App", "WhatsApp", "Telegram", "SMS"] as const;
type ChannelOption = (typeof CHANNEL_OPTIONS)[number];

const CHANNEL_CODE: Record<ChannelOption, BroadcastChannel> = {
  "In-App": "in_app",
  WhatsApp: "whatsapp",
  Telegram: "telegram",
  SMS: "sms",
};

const CHANNEL_LABEL: Record<BroadcastChannel, ChannelOption> = {
  in_app: "In-App",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  sms: "SMS",
};

/** Which `CHANNELS` row (the capacity panel) each channel code belongs to. */
const CHANNEL_ROW: Record<string, BroadcastChannel> = {
  "WhatsApp Groups": "whatsapp",
  "Telegram Channels": "telegram",
  "SMS Broadcasts": "sms",
};

type Audience = (typeof AUDIENCES)[number];

const AUDIENCE_CODE: Record<Audience, string> = {
  All: "all",
  Youth: "youth",
  Traders: "traders",
  Civil: "civil_servants",
  Swing: "swing_voters",
};

const AUDIENCE_LABEL = Object.fromEntries(
  Object.entries(AUDIENCE_CODE).map(([label, code]) => [code, label]),
) as Record<string, Audience>;

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

/** Composer field → API field, for placing 422 messages. */
const FIELD_FOR: Record<string, string> = {
  title: "title",
  body: "body",
  audience_segment: "audience",
  target_state_id: "state",
  channel: "channel",
};

function statusOf(b: Broadcast): CampaignStatus {
  return b.status === "published" ? "Sent" : "Draft";
}

export default function Communications() {
  const [channel, setChannel] = useState<ChannelOption>("In-App");
  const [audience, setAudience] = useState<Audience>("All");
  const { apiCampaign, stateUnits, scopeUnit, scopeLabel } = useFilters();
  const { access } = useAuth();
  const canManage = !!access?.can_manage;
  // Targeting defaults to the active scope so composing respects the filter.
  const [stateId, setStateId] = useState(scopeUnit?.id ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const unitName = useUnitNames();
  const now = useNow();
  const broadcastsQuery = useBroadcasts(apiCampaign?.id);
  const create = useCreateBroadcast(apiCampaign?.id);
  const publish = usePublishBroadcast(apiCampaign?.id);
  const busy = create.isPending || publish.isPending;

  const isInApp = channel === "In-App";
  const broadcasts = [...(broadcastsQuery.data ?? [])]
    .filter((b) => !scopeUnit || !b.target_state_id || b.target_state_id === scopeUnit.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  async function dispatch() {
    setErrors({});
    if (isInApp && !title.trim()) {
      setErrors({ title: "In-app notices need a title." });
      return;
    }
    if (!body.trim()) {
      toast.error("Write a message before dispatching.");
      return;
    }

    let draft: Broadcast;
    try {
      draft = await create.mutateAsync({
        channel: CHANNEL_CODE[channel],
        body: body.trim(),
        title: isInApp ? title.trim() : undefined,
        audience_segment: AUDIENCE_CODE[audience],
        target_state_id: stateId || undefined,
      });
    } catch (err) {
      const e = toApiError(err);
      const placed = Object.fromEntries(
        Object.entries(e.fieldErrors)
          .filter(([k]) => FIELD_FOR[k])
          .map(([k, msg]) => [FIELD_FOR[k], msg]),
      );
      if (e.isValidation && Object.keys(placed).length) setErrors(placed);
      else toast.error(errorMessage(e));
      return;
    }

    const target = `${channel} · ${audience} · ${stateId ? unitName(stateId) : "All"}`;
    if (!isInApp) {
      // External delivery is blocked until a provider is configured.
      toast.success(`Draft saved for ${target}. Not sent: ${channel} provider isn't configured.`);
      setBody("");
      return;
    }

    try {
      await publish.mutateAsync(draft.id);
      toast.success(`Published to ${target}`);
      setTitle("");
      setBody("");
    } catch (err) {
      toast.error(`Saved as a draft but not published: ${errorMessage(err)}`);
    }
  }

  function publishDraft(b: Broadcast) {
    publish.mutate(b.id, {
      onSuccess: () => toast.success(`Published "${b.title ?? "notice"}"`),
      onError: (err) => toast.error(errorMessage(err)),
    });
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

      {/* No delivery provider reports reach, engagement or shares yet. */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total Reach"
          value="—"
          caption="Delivery metrics unavailable"
          tone="primary"
          icon={<Radar className="h-4 w-4" />}
        />
        <StatCard
          label="Engagement"
          value="—"
          caption="No provider connected"
          tone="accent"
          icon={<Signal className="h-4 w-4" />}
        />
        <StatCard
          label="Shares"
          value="—"
          caption="No provider connected"
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
                {!isInApp && (
                  <p className="text-[10px] text-muted-foreground">
                    {channel} delivery isn't configured yet — messages are saved as drafts.
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="audience">Audience</Label>
                  <Select
                    id="audience"
                    className="w-full"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as Audience)}
                  >
                    {AUDIENCES.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </Select>
                  {errors.audience && <FieldError message={errors.audience} />}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State</Label>
                  <Select
                    id="state"
                    className="w-full"
                    value={stateId}
                    onChange={(e) => setStateId(e.target.value)}
                  >
                    <option value="">All</option>
                    {stateUnits.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                  {errors.state && <FieldError message={errors.state} />}
                </div>
              </div>

              {isInApp && (
                <div className="space-y-1.5">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Morning briefing"
                    aria-invalid={!!errors.title}
                  />
                  {errors.title && <FieldError message={errors.title} />}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write the campaign message…"
                  aria-invalid={!!errors.body}
                />
                <p className="text-right font-mono text-[10px] text-muted-foreground">
                  {body.length} / 640
                </p>
                {errors.body && <FieldError message={errors.body} />}
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

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={dispatch}
                disabled={busy || !canManage}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isInApp ? (
                  <Send className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isInApp ? "Dispatch Campaign" : "Save Draft"}
              </Button>
            </div>
          </Panel>

          <Panel title="Communications Channels" subtitle="Capacity across the network">
            <ul className="space-y-3">
              {CHANNELS.map((c) => {
                const drafts = (broadcastsQuery.data ?? []).filter(
                  (b) => b.channel === CHANNEL_ROW[c.name],
                ).length;
                return (
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
                        {drafts.toLocaleString()} draft{drafts === 1 ? "" : "s"} · provider not
                        configured
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <Panel
          title="Live Campaigns"
          subtitle="Refreshes every minute"
          icon={<Radar className="h-4 w-4" />}
          bodyClassName="p-0"
        >
          {broadcastsQuery.isLoading ? (
            <LoadingRows rows={3} />
          ) : broadcastsQuery.isError ? (
            <ErrorState error={broadcastsQuery.error} onRetry={() => broadcastsQuery.refetch()} />
          ) : (
            <ul className="divide-y divide-border">
              {broadcasts.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No campaigns targeting {scopeLabel}.
                </li>
              )}
              {broadcasts.map((c) => {
                const status = statusOf(c);
                const metrics = c.delivery_metrics;
                const reach = metrics?.reach;
                const engagement = metrics?.engagement;
                const shares = metrics?.shares;
                return (
                  <li
                    key={c.id}
                    className="px-4 py-4 transition-colors hover:bg-secondary/30 sm:px-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold">
                          {c.title ?? c.body.split("\n")[0]}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {CHANNEL_LABEL[c.channel] ?? c.channel} ·{" "}
                          {AUDIENCE_LABEL[c.audience_segment] ?? c.audience_segment} ·{" "}
                          {c.target_state_id ? (unitName(c.target_state_id) ?? "State") : "All"} ·{" "}
                          {relativeTime(c.published_at ?? c.created_at, now)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {status === "Draft" && c.channel === "in_app" && canManage && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={publish.isPending}
                            onClick={() => publishDraft(c)}
                          >
                            Publish
                          </Button>
                        )}
                        <Badge tone={STATUS_TONE[status]}>{status}</Badge>
                      </div>
                    </div>

                    <p className="mt-2 truncate text-[12px] text-muted-foreground">{c.body}</p>

                    <dl className="mt-3 grid grid-cols-3 gap-3">
                      <Stat
                        label="Reach"
                        value={reach != null ? `${(reach / 1000).toFixed(1)}k` : "—"}
                      />
                      <Stat label="Engage" value={engagement != null ? `${engagement}%` : "—"} />
                      <Stat label="Shares" value={shares != null ? shares.toLocaleString() : "—"} />
                    </dl>

                    <Meter
                      value={engagement ?? 0}
                      max={40}
                      className="mt-3"
                      color="var(--color-chart-2)"
                    />
                  </li>
                );
              })}
            </ul>
          )}
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

function FieldError({ message }: { message: string }) {
  return <p className="text-[11px] text-destructive">{message}</p>;
}
