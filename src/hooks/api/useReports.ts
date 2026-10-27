import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reportsApi, saveBlob, type OperationsFormat } from "../../services/reports";
import type { ParticipationMode } from "../../services/participation";
import { ApiError } from "../../services/errors";

/** How long "Download All" waits for the export job before giving up. */
const EXPORT_TIMEOUT_MS = 3 * 60_000;
const EXPORT_POLL_MS = 2_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Export states that are still on their way to `ready` or `failed`. */
const UNFINISHED = new Set(["queued", "processing", "pending"]);

/** Downloads the operations report for a date window as CSV or PDF. */
export function useOperationsDownload(campaignId: string | undefined) {
  return useMutation({
    mutationFn: async (input: { from: string; to: string; format: OperationsFormat }) => {
      const { blob, filename } = await reportsApi.operationsFile(campaignId!, input);
      saveBlob(blob, filename ?? `sentinel-operations-${input.from}-${input.to}.${input.format}`);
    },
  });
}

/**
 * Creates a participation export, waits for it to finish, then downloads
 * the CSV through its short-lived signed link.
 */
export function useParticipationExport(campaignId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { pollingOccasionId: string; mode: ParticipationMode }) => {
      // Resume an unfinished export for the same occasion and mode rather than
      // queueing a duplicate each time the button is pressed.
      const existing = (await reportsApi.exports(campaignId!)).find(
        (e) =>
          e.polling_occasion_id === input.pollingOccasionId &&
          e.mode === input.mode &&
          UNFINISHED.has(e.status),
      );
      let job =
        existing ??
        (
          await reportsApi.createExport(
            campaignId!,
            { polling_occasion_id: input.pollingOccasionId, mode: input.mode },
            crypto.randomUUID(),
          )
        ).data;
      const deadline = Date.now() + EXPORT_TIMEOUT_MS;
      while (job.status !== "ready") {
        if (job.status === "failed") {
          throw new ApiError({ status: -1, message: "The export failed on the server. Try again." });
        }
        if (Date.now() > deadline) {
          throw new ApiError({
            status: -1,
            message: "The export is still being prepared. Try Download All again shortly.",
          });
        }
        await sleep(EXPORT_POLL_MS);
        job = (await reportsApi.export(job.id)).data;
      }
      const link = (await reportsApi.downloadLink(job.id)).data;
      const { blob, filename } = await reportsApi.downloadSigned(link.url);
      saveBlob(blob, filename ?? `sentinel-participation-${job.id}.csv`);
      return job;
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId, "exports"] }),
  });
}
