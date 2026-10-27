import type { CampaignAnalytics } from "../services/dashboard";
import type { IntelligenceSummary } from "../services/intelligence";
import { isoDay } from "./format";

const DAY_MS = 86_400_000;

/** "29 Jul" — short enough for an axis tick. */
export function shortDay(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/** The `weeks` × 7-day window ending today, as `YYYY-MM-DD` bounds. */
export function weeklyWindow(weeks: number, today = new Date()) {
  const to = new Date(today);
  const from = new Date(today);
  from.setDate(to.getDate() - (weeks * 7 - 1));
  return { from: isoDay(from), to: isoDay(to) };
}

export interface WeeklyRow {
  /** First day of the week, `YYYY-MM-DD`. */
  start: string;
  label: string;
  reach: number;
  fieldReports: number;
  pollingReports: number;
}

/**
 * Daily operational counts summed into consecutive 7-day buckets from
 * `from`. Days with no record count as zero — an empty week is a real zero
 * here, because the analytics cover every report received.
 */
export function weeklyActivity(
  analytics: CampaignAnalytics | undefined,
  from: string,
  weeks: number,
): WeeklyRow[] {
  const start = new Date(`${from}T00:00:00`).getTime();
  const rows: WeeklyRow[] = Array.from({ length: weeks }, (_, i) => {
    const day = isoDay(new Date(start + i * 7 * DAY_MS));
    return { start: day, label: shortDay(day), reach: 0, fieldReports: 0, pollingReports: 0 };
  });
  const bucket = (day: string) => {
    const i = Math.floor((new Date(`${day}T00:00:00`).getTime() - start) / (7 * DAY_MS));
    return i >= 0 && i < weeks ? rows[i] : undefined;
  };
  for (const d of analytics?.daily_field_reports ?? []) {
    const row = bucket(d.day);
    if (!row) continue;
    row.fieldReports += d.total;
    row.reach += Number(d.declared_people_reached) || 0;
  }
  for (const d of analytics?.daily_polling_reports ?? []) {
    const row = bucket(d.day);
    if (row) row.pollingReports += d.total;
  }
  return rows;
}

/**
 * Net sentiment per observed day on the 0–100 scale the Intelligence dial
 * uses (50 is balanced). Days without observations are left out rather than
 * drawn as neutral.
 */
export function dailyNetSentiment(summary: IntelligenceSummary | undefined) {
  const byDay = new Map<string, { pos: number; neg: number; total: number }>();
  for (const t of summary?.trend ?? []) {
    const d = byDay.get(t.day) ?? { pos: 0, neg: 0, total: 0 };
    d.total += t.observation_count;
    if (t.sentiment === "positive") d.pos += t.observation_count;
    else if (t.sentiment === "negative") d.neg += t.observation_count;
    byDay.set(t.day, d);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, d]) => ({
      day,
      label: shortDay(day),
      score: Math.round(((d.pos - d.neg) / d.total) * 50 + 50),
    }));
}
