import { useState } from "react";
import { toast } from "sonner";
import { Download, Eye, FileText, Paperclip } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { formatDateTime, humanize } from "../../lib/format";
import { evidenceStatus, fileSize } from "../../lib/media";
import { observerStatus } from "../../lib/reports";
import { saveBlob, type ObserverReport, type ObserverReportMedia } from "../../services/reports";
import { operationsApi } from "../../services/operations";
import { errorMessage } from "../../services/errors";

/** The full contents of one observer report, with any files the observer attached. */
export function ObserverReportDialog({
  report,
  onClose,
}: {
  report: ObserverReport | null;
  onClose: () => void;
}) {
  const [downloading, setDownloading] = useState<string | null>(null);

  if (!report) return null;

  const status = observerStatus(report.status);

  async function download(m: ObserverReportMedia) {
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
    ["Location", report.location || "—"],
    ["Community", report.community || "—"],
    ["Observed", formatDateTime(report.observed_at)],
    ["Submitted", formatDateTime(report.submitted_at)],
    ["Reviewed", report.reviewed_at ? formatDateTime(report.reviewed_at) : "Not yet"],
    ["Revision", String(report.revision)],
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title="Observer report"
      description={`Submitted ${formatDateTime(report.submitted_at ?? report.created_at)}`}
      icon={<Eye className="h-4 w-4" />}
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
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">{report.category_label || humanize(report.category)}</Badge>
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
          </div>
          <p className="mt-2.5 whitespace-pre-wrap wrap-break-word text-[13px] leading-relaxed">
            {report.details || <span className="text-muted-foreground">No details provided.</span>}
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-x-4 gap-y-3 rounded-lg border border-border bg-secondary/25 p-3 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 wrap-break-word text-[13px]">{value}</dd>
            </div>
          ))}
          {report.review_notes && (
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Review notes
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap wrap-break-word text-[13px]">
                {report.review_notes}
              </dd>
            </div>
          )}
        </dl>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            Evidence
          </p>
          {report.media.length === 0 ? (
            <p className="text-xs text-muted-foreground">No evidence attached.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {report.media.map((m) => {
                const state = evidenceStatus(m);
                return (
                  <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px]" title={m.original_filename}>
                        {m.original_filename}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {[m.media_type, fileSize(m.byte_size), humanize(m.slot)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {m.downloadable ? (
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
                      <Badge tone={state.tone}>{state.ready ? "Unavailable" : state.label}</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {report.media.some((m) => !m.downloadable) && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Files can be downloaded once they pass the security scan and are approved.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
