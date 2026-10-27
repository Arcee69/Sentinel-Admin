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
  /**
   * The operations report as a file. The API's CORS policy doesn't expose
   * Content-Disposition, so the caller names the file.
   */
  operationsFile: async (
    campaignId: string,
    query: { from: string; to: string; format: OperationsFormat },
  ) => {
    const res = await apiInstance.get<Blob>(API.campaign.operationsReport(campaignId), {
      params: query,
      responseType: "blob",
      headers: { Accept: query.format === "pdf" ? "application/pdf" : "text/csv" },
    });
    return res.data;
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
  /**
   * Fetches the CSV behind a signed URL. The API currently also requires the
   * bearer token on it (500 without), which the shared client attaches.
   */
  downloadSigned: async (url: string) => {
    const res = await apiInstance.get<Blob>(url, { responseType: "blob" });
    return res.data;
  },
};
