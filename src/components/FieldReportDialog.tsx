import { useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Paperclip, Rss } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Badge, type BadgeTone } from "./ui/Badge";
import { Button } from "./ui/Button";
import { InlineSpinner } from "./ui/AsyncState";
import { useCampaignMedia, useTasksQuery } from "../hooks/api/useOperations";
import { usePeopleDirectory } from "../hooks/api/usePeople";
import { useUnitLineage } from "../hooks/useUnitNames";
import { METHOD_LABEL } from "../lib/tasks";
import { formatCount, formatDateTime, humanize } from "../lib/format";
import type { ReportType } from "../lib/data";
import { saveBlob } from "../services/reports";
import { errorMessage } from "../services/errors";
import { operationsApi, type ApiFieldReport, type MediaEvidence } from "../services/operations";

const TYPE_TONE: Record<ReportType, BadgeTone> = {
  Rally: "primary",
  "Door-to-Door": "accent",
  "Town Hall": "info",
  Media: "warning",
  Distribution: "success",
};

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Evidence downloads only after a clean scan and an approving review. */
function evidenceStatus(m: MediaEvidence): { label: string; tone: BadgeTone; ready: boolean } {
  if (m.review_state === "rejected") return { label: "Rejected", tone: "destructive", ready: false };
  if (m.scan_state === "pending") return { label: "Awaiting scan", tone: "muted", ready: false };
  if (m.scan_state !== "clean") {
    return { label: `Scan: ${humanize(m.scan_state)}`, tone: "destructive", ready: false };
  }
  if (m.review_state === "approved") return { label: "Approved", tone: "success", ready: true };
  return { label: "Awaiting review", tone: "warning", ready: false };
}

/** The full contents of one field report, with any evidence the agent attached. */
export function FieldReportDialog({
  report,
  onClose,
}: {
  report: ApiFieldReport | null;
  onClose: () => void;
}) {
  const campaignId = report?.campaign_id;
  const personName = usePeopleDirectory();
  const lineage = useUnitLineage([report?.geographic_unit_id]);
  const tasks = useTasksQuery(report?.task_id ? campaignId : undefined);
  const media = useCampaignMedia(campaignId, !!report);
  const [downloading, setDownloading] = useState<string | null>(null);

  if (!report) return null;

  const type = report.collection_method ? METHOD_LABEL[report.collection_method] : null;
  const where = lineage(report.geographic_unit_id);
  const task = report.task_id ? tasks.data?.find((t) => t.id === report.task_id) : undefined;
  const evidence = (media.data ?? []).filter((m) => m.field_report_id === report.id);

  async function download(m: MediaEvidence) {
    setDownloading(m.id);
    try {
      const link = (await operationsApi.mediaDownloadLink(m.id)).data;
      saveBlob(await operationsApi.downloadMedia(link.url), m.original_filename);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDownloading(null);
    }
  }

  const details: [string, string][] = [
    ["Agent", personName(report.author_membership_id)],
    [
      "Location",
      [where?.state?.name, where?.lga?.name, where?.ward?.name].filter(Boolean).join(" · ") || "—",
    ],
    ["People reached", formatCount(report.people_reached)],
    ["Activity", humanize(report.activity_type)],
    ["Linked task", report.task_id ? (task?.title ?? (tasks.isLoading ? "Loading…" : "—")) : "None"],
    ["Observed", formatDateTime(report.observed_at)],
    ["Received", formatDateTime(report.received_at)],
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title="Field report"
      description={`Submitted ${formatDateTime(report.received_at)}`}
      icon={<Rss className="h-4 w-4" />}
      footer={
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          {type ? (
            <Badge tone={TYPE_TONE[type]}>{type}</Badge>
          ) : (
            <Badge tone="muted">{humanize(report.activity_type)}</Badge>
          )}
          <p className="mt-2.5 whitespace-pre-wrap wrap-break-word text-[13px] leading-relaxed">
            {report.narrative || <span className="text-muted-foreground">No narrative provided.</span>}
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-x-4 gap-y-3 rounded-lg border border-border bg-secondary/25 p-3 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 wrap-break-word text-[13px]">{value}</dd>
            </div>
          ))}
        </dl>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            Evidence
          </p>
          {media.isLoading ? (
            <InlineSpinner />
          ) : media.isError ? (
            <p className="text-xs text-muted-foreground">
              Couldn't load attachments: {errorMessage(media.error)}
            </p>
          ) : evidence.length === 0 ? (
            <p className="text-xs text-muted-foreground">No evidence attached.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {evidence.map((m) => {
                const status = evidenceStatus(m);
                return (
                  <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px]" title={m.original_filename}>
                        {m.original_filename}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {[m.media_type, fileSize(m.byte_size), m.review_reason]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {status.ready ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => download(m)}
                        disabled={downloading === m.id}
                      >
                        <Download className="h-3 w-3" />
                        {downloading === m.id ? "Downloading…" : "Download"}
                      </Button>
                    ) : (
                      <Badge tone={status.tone}>{status.label}</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {evidence.some((m) => !evidenceStatus(m).ready) && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Files can be downloaded once they pass the security scan and are approved.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
