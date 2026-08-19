import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Lock, TriangleAlert } from "lucide-react";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Input, Label, Select, Textarea } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { ParticipationShell } from "../../components/participation/ParticipationShell";
import { ParticipationEmpty } from "../../components/participation/ParticipationKpi";
import { ProvenanceTag, StatusPill } from "../../components/participation/Tags";
import { useParticipation, type NewReport } from "../../context/ParticipationContext";
import {
  accreditationRateOf,
  canVerify,
  canWrite,
  formatCount,
  formatPercent,
  formatRelative,
  participationRateOf,
  validateReport,
  type PuRow,
  type VerificationStatus,
} from "../../lib/participation";

const ROW_LIMIT = 300;

/** Blank means "not captured", which is different from zero. */
const num = (v: string): number | null => (v.trim() === "" ? null : Number(v));

const BLANK_REPORT = {
  displayed: "",
  accredited: "",
  participating: "",
  valid: "",
  invalid: "",
  observations: "",
  incident: "",
};

const REPORT_FIELDS = [
  ["displayed", "Registered voters displayed/confirmed"],
  ["accredited", "Accredited voters"],
  ["participating", "Voters who participated"],
  ["valid", "Valid votes"],
  ["invalid", "Invalid votes"],
] as const;

/**
 * Election-day capture.
 *
 * The baseline is shown but not editable. If the figure on the board at the
 * polling unit disagrees, the agent records what they saw and a discrepancy is
 * raised — the register itself is never rewritten from the field.
 */
function ReportDialog({
  row,
  open,
  onClose,
  onSubmit,
}: {
  row: PuRow | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (input: NewReport) => void;
}) {
  const [form, setForm] = useState(BLANK_REPORT);

  const issues = useMemo(
    () =>
      row
        ? validateReport({
            registered: row.registered,
            registeredDisplayed: num(form.displayed),
            accredited: num(form.accredited),
            participating: num(form.participating),
            valid: num(form.valid),
            invalid: num(form.invalid),
            reportedAt: new Date().toISOString(),
          })
        : [],
    [row, form],
  );
  const blocked = issues.some((i) => i.blocking);

  const submit = () => {
    if (!row) return;
    onSubmit({
      polling_unit_id: row.id,
      registered_voters_displayed: num(form.displayed),
      accredited_voters: num(form.accredited),
      participating_voters: num(form.participating),
      valid_votes: num(form.valid),
      invalid_votes: num(form.invalid),
      result_observations: form.observations,
      incident_note: form.incident,
    });
    setForm(BLANK_REPORT);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Election-day report"
      description={
        row
          ? `${row.inec_pu_id} · ${row.name} — ${row.ward}, ${row.lga}, ${row.state}`
          : undefined
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            Submitted as SENTINEL OBSERVED · unverified until reviewed.
          </p>
          <Button variant="primary" size="sm" onClick={submit} disabled={blocked || !row}>
            Submit report
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Lock className="h-3 w-3" /> INEC registered voters (baseline)
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
            {formatCount(row?.registered)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Locked to the official register. If the figure displayed at the polling unit differs,
            enter it below — a discrepancy record is raised instead of changing the baseline.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {REPORT_FIELDS.map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label className="text-[11px]">{label}</Label>
              <Input
                type="number"
                min={0}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <Label className="text-[11px]">Election result observations</Label>
          <Textarea
            rows={2}
            value={form.observations}
            onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px]">Incidents</Label>
          <Textarea
            rows={2}
            value={form.incident}
            onChange={(e) => setForm((f) => ({ ...f, incident: e.target.value }))}
          />
        </div>

        {issues.length > 0 && (
          <div className="space-y-1 rounded-lg border border-warning/40 bg-warning/5 p-3">
            {issues.map((issue, i) => (
              <p key={i} className="flex items-start gap-2 text-[11px] text-warning">
                <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  {issue.message}
                  {issue.blocking ? " — blocks submission" : " — will be flagged for review"}
                </span>
              </p>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function PollingUnits() {
  const { data, role, addPollingUnit, submitReport, verifyReport } = useParticipation();
  const [filters, setFilters] = useState({ state: "", lga: "", ward: "", search: "" });
  const [target, setTarget] = useState<PuRow | null>(null);
  const [draft, setDraft] = useState({
    inec_pu_id: "",
    name: "",
    state: "",
    lga: "",
    ward: "",
    registered: "",
  });

  const mayReport = canWrite(role);
  const mayVerify = canVerify(role);

  const rows = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return data.rows.filter(
      (r) =>
        (!filters.state || r.state === filters.state) &&
        (!filters.lga || r.lga === filters.lga) &&
        (!filters.ward || r.ward === filters.ward) &&
        (!q || r.inec_pu_id.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)),
    );
  }, [data, filters]);

  /** Options for one level, narrowed by the levels above it. */
  const optionsFor = (key: "state" | "lga" | "ward") =>
    [
      ...new Set(
        data.rows
          .filter(
            (r) =>
              (!filters.state || r.state === filters.state) &&
              (!filters.lga || r.lga === filters.lga),
          )
          .map((r) => r[key]),
      ),
    ].sort();

  const addUnit = () => {
    addPollingUnit({
      inec_pu_id: draft.inec_pu_id.trim(),
      name: draft.name.trim() || undefined,
      state: draft.state.trim(),
      lga: draft.lga.trim(),
      ward: draft.ward.trim(),
      registered: draft.registered ? Number(draft.registered) : null,
    });
    toast.success("Polling unit registered");
    setDraft({ inec_pu_id: "", name: "", state: "", lga: "", ward: "", registered: "" });
  };

  const verify = (reportId: string, status: VerificationStatus) => {
    verifyReport(reportId, status);
    toast.success(`Report marked ${status.replace(/_/g, " ")}`);
  };

  const capture = (input: NewReport) => {
    try {
      const issues = submitReport(input);
      toast.success(
        issues.length
          ? `Report submitted with ${issues.length} flag(s) for review`
          : "Report submitted as Sentinel Observed (unverified)",
      );
      setTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission rejected");
    }
  };

  return (
    <ParticipationShell
      title="Polling Units"
      subtitle="Register baseline · agent reports · verification chain"
      actions={
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {formatCount(rows.length)} of {formatCount(data.rows.length)} units
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

      {mayVerify && (
        <Panel title="Register a polling unit (INEC reference data)">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {(
              [
                ["inec_pu_id", "PU code"],
                ["name", "Name"],
                ["state", "State"],
                ["lga", "LGA"],
                ["ward", "Ward"],
                ["registered", "Registered voters"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label className="text-[11px]">{label}</Label>
                <Input
                  value={draft[key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <Button
            className="mt-3"
            size="sm"
            variant="outline"
            disabled={!draft.inec_pu_id || !draft.state || !draft.lga || !draft.ward}
            onClick={addUnit}
          >
            Add polling unit
          </Button>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Registered voters are stored as an INEC baseline against the active register version
            and become immutable once verified.
          </p>
        </Panel>
      )}

      <Panel title="Polling unit records">
        {rows.length === 0 ? (
          <ParticipationEmpty message="No polling units match this filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-xs">
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
                  return (
                    <tr key={row.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-3">
                        <p className="font-semibold">{row.inec_pu_id}</p>
                        <p className="text-[11px] text-muted-foreground">{row.name}</p>
                      </td>
                      <td className="py-2 pr-3 text-[11px] text-muted-foreground">
                        {row.ward} · {row.lga} · {row.state}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatCount(row.registered)}
                        <div className="mt-0.5 flex justify-end">
                          <ProvenanceTag
                            value={row.registered == null ? "unverified" : "inec_official"}
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatCount(report?.accredited_voters)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatCount(report?.participating_voters)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatPercent(
                          accreditationRateOf(report?.accredited_voters ?? 0, row.registered ?? 0),
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatPercent(
                          participationRateOf(
                            report?.participating_voters ?? 0,
                            row.registered ?? 0,
                          ),
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-1">
                          <StatusPill
                            value={report ? report.verification_status : "no report"}
                            tone={
                              !report
                                ? "muted"
                                : ["verified", "peer_reviewed"].includes(report.verification_status)
                                  ? "primary"
                                  : report.verification_status === "rejected"
                                    ? "destructive"
                                    : "warning"
                            }
                          />
                          {report?.is_duplicate && <StatusPill value="duplicate" tone="warning" />}
                          {row.anomalies > 0 && (
                            <StatusPill value={`${row.anomalies} anomaly`} tone="destructive" />
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {report ? formatRelative(report.reported_at) : "awaiting report"}
                        </p>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-1">
                          {mayReport && (
                            <Button size="sm" variant="outline" onClick={() => setTarget(row)}>
                              Report
                            </Button>
                          )}
                          {mayVerify && report && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => verify(report.id, "verified")}
                              >
                                Verify
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => verify(report.id, "peer_reviewed")}
                              >
                                Peer review
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => verify(report.id, "rejected")}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <ReportDialog
        row={target}
        open={!!target}
        onClose={() => setTarget(null)}
        onSubmit={capture}
      />
    </ParticipationShell>
  );
}
