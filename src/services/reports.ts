import apiInstance from "./instance";
import { API } from "./api";
import { getAllPages, getList, getMethod, postMethod } from "./requests";
import type { ParticipationMode } from "./participation";

export type OperationsFormat = "csv" | "pdf";

/** One participation export job; poll until `ready` or `failed`. */
export interface ParticipationExport {
  id: string;
  campaign_id: string;
  polling_occasion_id: string;
  mode: ParticipationMode;
  kind: string;
  status: "queued" | "processing" | "ready" | "failed" | (string & {});
  row_count: number | null;
  sha256: string | null;
  byte_size: number | null;
  as_of: string | null;
  completed_at: string | null;
}

export type ObserverReportStatus = "draft" | "in_review" | "reviewed" | (string & {});

/** A file an observer attached to a report. */
export interface ObserverReportMedia {
  id: string;
  slot: string;
  original_filename: string;
  media_type: string;
  byte_size: number;
  scan_state: string;
  review_state: string;
  /** True once the file has passed its scan and review. */
  downloadable: boolean;
}

/** One report an observer filed from the field app. */
export interface ObserverReport {
  id: string;
  client_submission_id: string;
  category: string;
  category_label: string;
  /** Readable place, e.g. "Lokoja - A, Lokoja, Kogi". */
  location: string | null;
  details: string | null;
  observed_at: string | null;
  geography_version_id: string;
  state_id: string | null;
  lga_id: string | null;
  ward_id: string | null;
  community: string | null;
  status: ObserverReportStatus;
  revision: number;
  review_notes: string | null;
  reviewed_at: string | null;
  submitted_at: string | null;
  created_at: string;
  media: ObserverReportMedia[];
}

/**
 * Filters the observer-reports list honours on the server. It ignores
 * `category` and `search`, so neither is offered.
 */
export interface ObserverReportsQuery {
  page: number;
  status?: "draft" | "in_review" | "reviewed";
  stateId?: string;
}

/** The filename from a Content-Disposition header, or null when it carries none. */
export function dispositionFilename(header: unknown): string | null {
  if (typeof header !== "string") return null;
  const encoded = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      /* malformed encoding — fall back to the plain filename */
    }
  }
  const plain = /filename\s*=\s*("([^"]*)"|[^;]+)/.exec(header);
  const name = (plain?.[2] ?? plain?.[1])?.trim();
  return name || null;
}

/** Saves a blob through a temporary link, the way a browser download works. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const reportsApi = {
  /** One page (25 rows) of observer reports, newest first. */
  observerReports: (campaignId: string, query: ObserverReportsQuery) =>
    getList<ObserverReport>(API.campaign.observerReports(campaignId), {
      page: query.page,
      status: query.status,
      state_id: query.stateId,
    }),

  /** The operations report as a file, with the filename the server gave it. */
  operationsFile: async (
    campaignId: string,
    query: { from: string; to: string; format: OperationsFormat },
  ) => {
    const res = await apiInstance.get<Blob>(API.campaign.operationsReport(campaignId), {
      params: query,
      responseType: "blob",
      headers: { Accept: query.format === "pdf" ? "application/pdf" : "text/csv" },
    });
    return { blob: res.data, filename: dispositionFilename(res.headers["content-disposition"]) };
  },

  exports: (campaignId: string) => getAllPages<ParticipationExport>(API.campaign.exports(campaignId)),
  /** Each request needs its own Idempotency-Key; a retry with the same key returns the same job. */
  createExport: (
    campaignId: string,
    payload: { polling_occasion_id: string; mode: ParticipationMode },
    idempotencyKey: string,
  ) =>
    postMethod<ParticipationExport>(API.campaign.exports(campaignId), payload, {
      headers: { "Idempotency-Key": idempotencyKey },
    }),
  export: (exportId: string) => getMethod<ParticipationExport>(API.export.show(exportId)),
  /** A signed URL valid for about five minutes; request a new one after it expires. */
  downloadLink: (exportId: string) =>
    getMethod<{ url: string; expires_at: string }>(API.export.downloadLink(exportId)),
  /** Fetches the CSV behind a signed URL, with the filename the server gave it. */
  downloadSigned: async (url: string) => {
    const res = await apiInstance.get<Blob>(url, { responseType: "blob" });
    return { blob: res.data, filename: dispositionFilename(res.headers["content-disposition"]) };
  },
};
