import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/Field";
import { LoadingRows } from "../../components/ui/AsyncState";
import { ReasonDialog } from "../../components/ui/ReasonDialog";
import { ParticipationShell } from "../../components/participation/ParticipationShell";
import { ParticipationEmpty } from "../../components/participation/ParticipationKpi";
import { ProvenanceTag, StatusPill } from "../../components/participation/Tags";
import { useAuth } from "../../context/AuthContext";
import {
  usePollingUnitRows,
  useReviewReport,
  type PollingUnitRow,
} from "../../hooks/api/useParticipation";
import {
  accreditationRateOf,
  formatCount,
  formatPercent,
  formatRelative,
  participationRateOf,
} from "../../lib/participation";
import { errorMessage, toApiError } from "../../services/errors";
import type { ParticipationReport, ReviewAction } from "../../services/participation";

const ROW_LIMIT = 300;

const REVIEW_COPY: Record<
  ReviewAction,
  { label: string; done: string; danger?: boolean; warning?: string }
> = {
  verify: { label: "Verify", done: "verified" },
  reject: { label: "Reject", done: "rejected", danger: true },
  // The API treats a revoked review as final: the report can't be reviewed again.
  revoke: {
    label: "Revoke",
    done: "revoked",
    danger: true,
    warning: "Revoking withdraws this review for good — the report can't be verified or rejected again.",
  },
};

/**
 * Register baseline, agent reports and the verification chain per polling unit.
 *
 * Reports are captured by agents in the field app; the back office reviews
 * them here. The baseline is never edited — a mismatch raises a discrepancy.
 */
export default function PollingUnits() {
  const { access } = useAuth();
  const { rows: allRows, isLoading } = usePollingUnitRows();
  const review = useReviewReport();
  const [filters, setFilters] = useState({ state: "", lga: "", ward: "", search: "" });
  const [pending, setPending] = useState<{
    row: PollingUnitRow;
    report: ParticipationReport;
    action: ReviewAction;
  } | null>(null);
  const [reasonError, setReasonError] = useState<string>();

  const mayVerify = !!access?.can_manage;

  const rows = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return allRows.filter(
      (r) =>
        (!filters.state || r.state === filters.state) &&
        (!filters.lga || r.lga === filters.lga) &&
        (!filters.ward || r.ward === filters.ward) &&
        (!q || r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)),
    );
  }, [allRows, filters]);

  /** Options for one level, narrowed by the levels above it. */
  const optionsFor = (key: "state" | "lga" | "ward") =>
    [
      ...new Set(
        allRows
          .filter(
            (r) =>
              (!filters.state || r.state === filters.state) &&
              (!filters.lga || r.lga === filters.lga),
          )
          .map((r) => r[key])
          .filter(Boolean),
      ),
    ].sort();

  function confirmReview(reason: string) {
    if (!pending) return;
    const { row, report, action } = pending;
    review.mutate(
      { reportId: report.id, action, reason, expected_revision: report.revision },
      {
        onSuccess: () => {
          toast.success(`${row.code} report ${REVIEW_COPY[action].done}`);
          setPending(null);
        },
        onError: (err) => {
          const e = toApiError(err);
          if (e.isValidation && e.fieldErrors.reason) {
            setReasonError(e.fieldErrors.reason);
            return;
          }
          toast.error(
            e.isConflict
              ? "This report changed since it loaded. The list has been refreshed — try again."
              : errorMessage(e),
          );
          setPending(null);
        },
      },
    );
  }

  return (
    <ParticipationShell
      title="Polling Units"
      subtitle="Register baseline · agent reports · verification chain"
      actions={
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {formatCount(rows.length)} of {formatCount(allRows.length)} units
        </span>
      }
    >
      <Panel title="Filters">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(["state", "lga", "ward"] as const).map((key) => (
            <Select
              key={key}
              aria-label={key}
              className="w-full"
              value={filters[key]}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  [key]: e.target.value,
                  // Clearing a broader level would otherwise strand the
                  // narrower one on a value that no longer exists.
                  ...(key === "state" ? { lga: "", ward: "" } : key === "lga" ? { ward: "" } : {}),
                }))
              }
            >
              <option value="">All {key.toUpperCase()}</option>
              {optionsFor(key).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
          ))}
          <Input
            placeholder="Search PU code or name"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
      </Panel>

      <Panel title="Polling unit records">
        {isLoading ? (
          <LoadingRows rows={4} padded={false} />
        ) : rows.length === 0 ? (
          <ParticipationEmpty message="No polling units match this filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-275 text-xs">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Polling unit</th>
                  <th className="py-2 pr-3 font-medium">Location</th>
                  <th className="py-2 pr-3 text-right font-medium">Registered</th>
                  <th className="py-2 pr-3 text-right font-medium">Accredited</th>
                  <th className="py-2 pr-3 text-right font-medium">Participating</th>
                  <th className="py-2 pr-3 text-right font-medium">Accred. rate</th>
                  <th className="py-2 pr-3 text-right font-medium">Turnout</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, ROW_LIMIT).map((row) => {
                  const report = row.report;
                  const accredited = report?.participation?.accredited_persons ?? null;
                  const participating = report?.participation?.participating_persons ?? null;
                  const duplicates = row.reports.filter((r) => r.review_state !== "rejected").length > 1;
                  const state = report?.review_state;
                  return (
                    <tr key={row.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-3">
                        <p className="font-semibold">{row.code}</p>
                        <p className="text-[11px] text-muted-foreground">{row.name}</p>
                      </td>
                      <td className="py-2 pr-3 text-[11px] text-muted-foreground">
                        {[row.ward, row.lga, row.state].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatCount(row.registered)}
                        <div className="mt-0.5 flex justify-end">
                          <ProvenanceTag value="inec_official" />
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatCount(accredited)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatCount(participating)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatPercent(accreditationRateOf(accredited ?? 0, row.registered))}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatPercent(participationRateOf(participating ?? 0, row.registered))}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-1">
                          <StatusPill
                            value={report ? state : "no report"}
                            tone={
                              !report
                                ? "muted"
                                : state === "verified"
                                  ? "primary"
                                  : state === "rejected" || state === "revoked"
                                    ? "destructive"
                                    : "warning"
                            }
                          />
                          {duplicates && <StatusPill value="duplicate" tone="warning" />}
                          {row.anomalies > 0 && (
                            <StatusPill value={`${row.anomalies} anomaly`} tone="destructive" />
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {report ? formatRelative(report.received_at) : "awaiting report"}
                        </p>
                      </td>
                      <td className="py-2 pr-3">
                        {/* The API only verifies or rejects a pending report, and only
                            revokes a decided one; a revoked report is final. */}
                        {mayVerify && report && (
                          <div className="flex flex-wrap gap-1">
                            {state === "pending_review" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setPending({ row, report, action: "verify" })}
                                >
                                  Verify
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setPending({ row, report, action: "reject" })}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {(state === "verified" || state === "rejected") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setPending({ row, report, action: "revoke" })}
                              >
                                Revoke
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {pending && (
        <ReasonDialog
          key={`${pending.report.id}:${pending.action}`}
          open
          title={`${REVIEW_COPY[pending.action].label} report`}
          description={[
            `${pending.row.code} · ${pending.row.name}`,
            REVIEW_COPY[pending.action].warning,
          ]
            .filter(Boolean)
            .join(" — ")}
          confirmLabel={REVIEW_COPY[pending.action].label}
          danger={REVIEW_COPY[pending.action].danger}
          busy={review.isPending}
          error={reasonError}
          onConfirm={confirmReview}
          onClose={() => {
            setPending(null);
            setReasonError(undefined);
          }}
        />
      )}
    </ParticipationShell>
  );
}
