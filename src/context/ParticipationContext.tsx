import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import {
  loadParticipationDataset,
  participationRole,
  pickReport,
  validateReport,
  type AnomalyStatus,
  type DiscrepancyStatus,
  type HistoricalTurnout,
  type ParticipationDataset,
  type ParticipationRole,
  type PuRow,
  type RegisterStatus,
  type TurnoutAnomaly,
  type TurnoutReport,
  type ValidationIssue,
  type VerificationStatus,
} from "../lib/participation";

export interface NewPollingUnit {
  inec_pu_id: string;
  name?: string;
  state: string;
  lga: string;
  ward: string;
  registered?: number | null;
}

export interface NewReport {
  polling_unit_id: string;
  registered_voters_displayed: number | null;
  accredited_voters: number | null;
  participating_voters: number | null;
  valid_votes: number | null;
  invalid_votes: number | null;
  result_observations?: string;
  incident_note?: string;
}

interface ParticipationValue {
  data: ParticipationDataset;
  versionId: string | null;
  setVersionId: (id: string | null) => void;
  role: ParticipationRole;
  /** Current agent identity for submissions and duplicate detection. */
  agentId: string;
  verifyReport: (reportId: string, status: VerificationStatus) => void;
  updateAnomaly: (anomalyId: string, status: AnomalyStatus) => void;
  resolveDiscrepancy: (discrepancyId: string, status: DiscrepancyStatus) => void;
  setVersionStatus: (versionId: string, status: RegisterStatus, lock?: boolean) => void;
  addPollingUnit: (input: NewPollingUnit) => void;
  /** Throws on a blocking validation issue; otherwise returns what was flagged. */
  submitReport: (input: NewReport) => ValidationIssue[];
  addHistorical: (input: HistoricalTurnout) => void;
}

const ParticipationContext = createContext<ParticipationValue | null>(null);

/** Re-derive the trusted report for a unit after its report set changes. */
function withReports(row: PuRow, reports: TurnoutReport[]): PuRow {
  return { ...row, reports, report: pickReport(reports) };
}

/**
 * Holds the participation dataset for the session and applies writes to it.
 *
 * There is no participation API yet, so this stands in for one: every action
 * the surfaces expose (verifying a report, resolving a discrepancy, capturing
 * a field report) mutates this store and every surface re-reads it, which is
 * how the pages stay consistent with each other. Switching register version
 * reloads the baseline the way a refetch would, so in-session edits against
 * the previous version do not carry over.
 */
export function ParticipationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [versionId, setVersionIdState] = useState<string | null>(null);
  const [data, setData] = useState<ParticipationDataset>(() => loadParticipationDataset(null));

  const role = participationRole(user?.role);
  const agentId = user ? `agt_${user.initials.toLowerCase()}` : "agt_session";

  const setVersionId = useCallback((id: string | null) => {
    setVersionIdState(id);
    setData(loadParticipationDataset(id));
  }, []);

  const verifyReport = useCallback((reportId: string, status: VerificationStatus) => {
    setData((prev) => ({
      ...prev,
      rows: prev.rows.map((row) =>
        row.reports.some((r) => r.id === reportId)
          ? withReports(
              row,
              row.reports.map((r) =>
                r.id === reportId ? { ...r, verification_status: status } : r,
              ),
            )
          : row,
      ),
    }));
  }, []);

  const updateAnomaly = useCallback((anomalyId: string, status: AnomalyStatus) => {
    setData((prev) => ({
      ...prev,
      anomalies: prev.anomalies.map((a) => (a.id === anomalyId ? { ...a, status } : a)),
    }));
  }, []);

  const resolveDiscrepancy = useCallback((discrepancyId: string, status: DiscrepancyStatus) => {
    setData((prev) => ({
      ...prev,
      discrepancies: prev.discrepancies.map((d) =>
        d.id === discrepancyId ? { ...d, status } : d,
      ),
    }));
  }, []);

  const setVersionStatus = useCallback(
    (id: string, status: RegisterStatus, lock = false) => {
      setData((prev) => ({
        ...prev,
        versions: prev.versions.map((v) =>
          v.id === id ? { ...v, verification_status: status, is_locked: lock || v.is_locked } : v,
        ),
      }));
    },
    [],
  );

  const addPollingUnit = useCallback(
    (input: NewPollingUnit) => {
      setData((prev) => {
        const row: PuRow = {
          id: `pu_new_${prev.rows.length}`,
          inec_pu_id: input.inec_pu_id,
          name: input.name?.trim() || input.inec_pu_id,
          state: input.state,
          lga: input.lga,
          ward: input.ward,
          registered: input.registered ?? null,
          // A baseline captured by hand is not a verified INEC import.
          registerVerified: false,
          registerVersionId: input.registered != null ? (prev.activeVersionId ?? null) : null,
          reports: [],
          report: null,
          anomalies: 0,
        };
        return { ...prev, rows: [row, ...prev.rows] };
      });
    },
    [],
  );

  const submitReport = useCallback(
    (input: NewReport) => {
      const row = data.rows.find((r) => r.id === input.polling_unit_id);
      if (!row) throw new Error("Polling unit not found");

      const reportedAt = new Date().toISOString();
      const issues = validateReport({
        registered: row.registered,
        registeredDisplayed: input.registered_voters_displayed,
        accredited: input.accredited_voters,
        participating: input.participating_voters,
        valid: input.valid_votes,
        invalid: input.invalid_votes,
        reportedAt,
        agentId,
        existingReports: row.reports.map((r) => ({
          reported_by: r.reported_by,
          reported_at: r.reported_at,
        })),
      });

      const blocking = issues.filter((i) => i.blocking);
      if (blocking.length) throw new Error(blocking.map((i) => i.message).join("; "));

      const report: TurnoutReport = {
        id: `rpt_new_${Date.now()}`,
        polling_unit_id: row.id,
        register_version_id: row.registerVersionId ?? data.activeVersionId,
        baseline_registered_voters: row.registered,
        registered_voters_displayed: input.registered_voters_displayed,
        accredited_voters: input.accredited_voters,
        participating_voters: input.participating_voters,
        valid_votes: input.valid_votes,
        invalid_votes: input.invalid_votes,
        result_observations: input.result_observations?.trim() || null,
        incident_note: input.incident_note?.trim() || null,
        // Everything captured in the field starts unverified, without exception.
        verification_status: "pending_review",
        is_duplicate: row.reports.length > 0,
        validation_flags: issues.map((i) => i.code),
        reported_by: agentId,
        reported_at: reportedAt,
      };

      const newAnomalies: TurnoutAnomaly[] = issues.map((issue, i) => ({
        id: `anm_new_${Date.now()}_${i}`,
        polling_unit_id: row.id,
        // `negative_value` and `votes_above_registered` block, so anything
        // reaching here maps onto a real anomaly type.
        anomaly_type: issue.code === "votes_above_registered"
          ? "turnout_above_registered"
          : issue.code === "negative_value"
            ? "votes_inconsistent_with_participating"
            : issue.code,
        severity: issue.severity,
        status: "open",
        detail: `${row.inec_pu_id} · ${issue.message}`,
        detected_at: reportedAt,
      }));

      setData((prev) => {
        const rows = prev.rows.map((r) =>
          r.id === row.id
            ? {
                ...withReports(r, [...r.reports, report]),
                anomalies: r.anomalies + newAnomalies.length,
              }
            : r,
        );

        const discrepancies = [...prev.discrepancies];
        const displayed = input.registered_voters_displayed;
        if (displayed != null && row.registered != null && displayed !== row.registered) {
          const difference = displayed - row.registered;
          discrepancies.unshift({
            id: `dsc_new_${Date.now()}`,
            polling_unit_id: row.id,
            register_version_id: report.register_version_id,
            turnout_report_id: report.id,
            inec_registered_voters: row.registered,
            reported_registered_voters: displayed,
            difference,
            severity:
              Math.abs(difference) / Math.max(1, row.registered) > 0.02 ? "material" : "minor",
            note: "Raised automatically from a field turnout report.",
            status: "open",
            created_at: reportedAt,
          });
        }

        return {
          ...prev,
          rows,
          discrepancies,
          anomalies: [...newAnomalies, ...prev.anomalies],
          reportCount: prev.reportCount + 1,
        };
      });

      return issues;
    },
    [data, agentId],
  );

  const addHistorical = useCallback((input: HistoricalTurnout) => {
    setData((prev) => ({ ...prev, historical: [...prev.historical, input] }));
  }, []);

  const value = useMemo<ParticipationValue>(
    () => ({
      data,
      versionId,
      setVersionId,
      role,
      agentId,
      verifyReport,
      updateAnomaly,
      resolveDiscrepancy,
      setVersionStatus,
      addPollingUnit,
      submitReport,
      addHistorical,
    }),
    [
      data,
      versionId,
      setVersionId,
      role,
      agentId,
      verifyReport,
      updateAnomaly,
      resolveDiscrepancy,
      setVersionStatus,
      addPollingUnit,
      submitReport,
      addHistorical,
    ],
  );

  return (
    <ParticipationContext.Provider value={value}>{children}</ParticipationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useParticipation(): ParticipationValue {
  const ctx = useContext(ParticipationContext);
  if (!ctx) throw new Error("useParticipation must be used inside <ParticipationProvider>");
  return ctx;
}
