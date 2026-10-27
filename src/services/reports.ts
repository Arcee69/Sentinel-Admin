import apiInstance from "./instance";
import { API } from "./api";
import { getAllPages, getMethod, postMethod } from "./requests";
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
