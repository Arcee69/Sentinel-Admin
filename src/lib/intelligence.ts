import type { IntelligenceSummary, ObservedLabel } from "../services/intelligence";
import { humanize } from "./format";

/** Sample sizes arrive as numbers or numeric strings depending on the list. */
const num = (v: number | string | null | undefined) => Number(v) || 0;

const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

export interface SentimentMix {
  positive: number;
  /** Neutral and mixed observations together. */
  neutral: number;
  negative: number;
  /** 0–100 net score: 50 is balanced, above leans positive. */
  net: number;
  /** Declared respondents behind the percentages. */
  total: number;
}

/** Sentiment shares weighted by declared sample size, across every channel. */
export function sentimentMix(summary: IntelligenceSummary | undefined): SentimentMix | null {
  const rows = summary?.breakdown ?? [];
  let positive = 0;
  let negative = 0;
  let neutral = 0;
  for (const r of rows) {
    const n = num(r.declared_sample_size);
    if (r.sentiment === "positive") positive += n;
    else if (r.sentiment === "negative") negative += n;
    else neutral += n;
  }
  const total = positive + negative + neutral;
  if (!total) return null;
  const pos = pct(positive, total);
  const neg = pct(negative, total);
  return {
    positive: pos,
    negative: neg,
    neutral: Math.max(0, 100 - pos - neg),
    net: Math.round((pos - neg + 100) / 2),
    total,
  };
}

function shares(items: ObservedLabel[]) {
  const total = items.reduce((t, i) => t + num(i.declared_sample_size), 0);
  return items
    .map((i) => ({ key: i.label, share: pct(num(i.declared_sample_size), total) }))
    .sort((a, b) => b.share - a.share);
}

export interface SegmentShare {
  label: string;
  share: number;
  /** Percentage-point change against the previous window; null without a baseline. */
  delta: number | null;
}

/**
 * Audience segments by share of declared respondents. Beyond `maxItems` the
 * tail is folded into "Other" so the fixed categorical palette never cycles.
 */
export function segmentShares(
  current: IntelligenceSummary | undefined,
  previous: IntelligenceSummary | undefined,
  maxItems = 4,
): SegmentShare[] {
  const now = shares(current?.audience_segments ?? []);
  const before = new Map(shares(previous?.audience_segments ?? []).map((s) => [s.key, s.share]));
  const hasBaseline = before.size > 0;

  const rows: SegmentShare[] = now.map((s) => ({
    label: humanize(s.key),
    share: s.share,
    delta: hasBaseline ? s.share - (before.get(s.key) ?? 0) : null,
  }));
  if (rows.length <= maxItems) return rows;
  const head = rows.slice(0, maxItems - 1);
  const other = rows.slice(maxItems - 1).reduce((t, r) => t + r.share, 0);
  return [...head, { label: "Other", share: other, delta: null }];
}

/** Issues as their share (0–100) of declared respondents, largest first. */
export function issueScores(summary: IntelligenceSummary | undefined) {
  return shares(summary?.key_issues ?? []).map((s) => ({ label: humanize(s.key), score: s.share }));
}

export interface InfluencerRow {
  name: string;
  initials: string;
  observations: number;
  sample: number;
  /** Sample size relative to the most-cited influencer (0–100), for the bar. */
  relative: number;
}

/** Influencer types as recorded on observations — not people or strength scores. */
export function influencerRows(summary: IntelligenceSummary | undefined): InfluencerRow[] {
  const items = summary?.influencers ?? [];
  const max = Math.max(1, ...items.map((i) => num(i.declared_sample_size)));
  return items
    .map((i) => {
      const name = humanize(i.label);
      const words = name.split(/\s+/);
      return {
        name,
        initials: ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase(),
        observations: i.observation_count,
        sample: num(i.declared_sample_size),
        relative: Math.round((num(i.declared_sample_size) / max) * 100),
      };
    })
    .sort((a, b) => b.sample - a.sample);
}
