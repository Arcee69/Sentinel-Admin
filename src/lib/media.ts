import type { BadgeTone } from "../components/ui/Badge";
import { humanize } from "./format";

export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Evidence downloads only after a clean scan and an approving review. */
export function evidenceStatus(m: { scan_state: string; review_state: string }): {
  label: string;
  tone: BadgeTone;
  ready: boolean;
} {
  if (m.review_state === "rejected") return { label: "Rejected", tone: "destructive", ready: false };
  if (m.scan_state === "pending") return { label: "Awaiting scan", tone: "muted", ready: false };
  if (m.scan_state !== "clean") {
    return { label: `Scan: ${humanize(m.scan_state)}`, tone: "destructive", ready: false };
  }
  if (m.review_state === "approved") return { label: "Approved", tone: "success", ready: true };
  return { label: "Awaiting review", tone: "warning", ready: false };
}
