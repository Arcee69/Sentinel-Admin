/**
 * Parses an API timestamp. Most carry `Z`, but some (e.g. activity events)
 * come as `2026-10-15 21:22:25.000000` with no offset; those are UTC.
 */
export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  let iso = value.trim().replace(" ", "T");
  if (/T\d{2}:\d{2}/.test(iso) && !/(Z|[+-]\d{2}:?\d{2})$/.test(iso)) iso += "Z";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const RELATIVE = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto", style: "short" });

/** "just now", "5 min ago", "3 days ago"; older than a fortnight shows the date. */
export function relativeTime(value: string | null | undefined, now = Date.now()): string {
  const d = parseApiDate(value);
  if (!d) return "—";
  const seconds = Math.round((d.getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  if (abs < 3600) return RELATIVE.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return RELATIVE.format(Math.round(seconds / 3600), "hour");
  if (abs < 14 * 86_400) return RELATIVE.format(Math.round(seconds / 86_400), "day");
  return formatDate(value);
}

export function formatDate(value: string | null | undefined): string {
  const d = parseApiDate(value);
  return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export function formatDateTime(value: string | null | undefined): string {
  const d = parseApiDate(value);
  return d
    ? d.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
}

/** Compact large counts the way the KPI tiles present them: 1.2M, 640k. */
export function formatReach(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export function formatCount(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value;
  return n == null || Number.isNaN(n) ? "—" : n.toLocaleString("en-GB");
}

/** `YYYY-MM-DD` in local time, for `from`/`to` date query params. */
export function isoDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "overdue_task" → "Overdue task". */
export function humanize(value: string | null | undefined): string {
  if (!value) return "";
  const s = value.replace(/[._-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
