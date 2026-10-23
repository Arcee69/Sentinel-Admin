import { API } from "./api";
import { getAllPages, getMethod, postMethod } from "./requests";

/** Only `in_app` delivers today; external channels can be drafted, not sent. */
export type BroadcastChannel = "in_app" | "whatsapp" | "telegram" | "sms";

export interface Broadcast {
  id: string;
  campaign_id: string;
  /** Required for in-app notices. */
  title: string | null;
  body: string;
  channel: BroadcastChannel;
  audience_segment: string;
  target_state_id: string | null;
  media_url: string | null;
  status: "draft" | "published" | (string & {});
  /** Null until a provider reports delivery; no provider is connected yet. */
  delivery_metrics: Record<string, number> | null;
  published_at: string | null;
  created_at: string;
}

export interface CreateBroadcastPayload {
  channel: BroadcastChannel;
  body: string;
  title?: string;
  audience_segment?: string;
  target_state_id?: string;
  /** Must be an https:// URL. */
  media_url?: string;
}

export const communicationsApi = {
  broadcasts: (campaignId: string) => getAllPages<Broadcast>(API.campaign.broadcasts(campaignId)),
  broadcast: (broadcastId: string) => getMethod<Broadcast>(API.broadcast.show(broadcastId)),
  create: (campaignId: string, payload: CreateBroadcastPayload) =>
    postMethod<Broadcast>(API.campaign.broadcasts(campaignId), payload),
  /** In-app drafts only; publishing twice is refused. */
  publish: (broadcastId: string) => postMethod<Broadcast>(API.broadcast.publish(broadcastId)),
};
