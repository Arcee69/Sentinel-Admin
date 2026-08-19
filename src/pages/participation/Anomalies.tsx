import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Field";
import { ParticipationShell } from "../../components/participation/ParticipationShell";
import {
  ParticipationEmpty,
  ParticipationKpi,
} from "../../components/participation/ParticipationKpi";
import { StatusPill } from "../../components/participation/Tags";
import { useParticipation } from "../../context/ParticipationContext";
import {
  ANOMALY_LABELS,
  ANOMALY_STATUSES,
  canVerify,
  formatCount,
  formatRelative,
  titleCase,
  type AnomalyStatus,
} from "../../lib/participation";

const FILTERS = [...ANOMALY_STATUSES, "all"] as const;
type Filter = (typeof FILTERS)[number];

const QUEUE_LIMIT = 100;

/**
 * The analyst queue. Anomalies are raised at submission time and by
 * reconciliation — nothing here is inferred after the fact, so an empty queue
 * genuinely means nothing tripped a rule.
 */
export default function Anomalies() {
  const { data, role, updateAnomaly } = useParticipation();
  const [filter, setFilter] = useState<Filter>("open");

  const mayReview = canVerify(role);
  const byId = useMemo(() => new Map(data.rows.map((r) => [r.id, r])), [data]);

  const queue = data.anomalies.filter((a) => filter === "all" || a.status === filter);

  const silent = useMemo(
    () => data.rows.filter((r) => r.registered != null && !r.report),
    [data],
  );

  const mix = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of data.anomalies) {
      if (a.status === "dismissed") continue;
      counts.set(a.anomaly_type, (counts.get(a.anomaly_type) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  const apply = (id: string, status: AnomalyStatus) => {
    updateAnomaly(id, status);
    toast.success(`Anomaly ${status}`);
  };

  const count = (status: AnomalyStatus) =>
    data.anomalies.filter((a) => a.status === status).length;

  return (
    <ParticipationShell
      title="Anomaly Detection"
      subtitle="Impossible figures, duplicate submissions, silent polling units and register anomalies"
      actions={
        <Select
          aria-label="Anomaly status filter"
          className="w-40 text-xs"
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
        >
          {FILTERS.map((f) => (
            <option key={f} value={f}>
              {titleCase(f)}
            </option>
          ))}
        </Select>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ParticipationKpi label="Open anomalies" value={formatCount(count("open"))} tone="warning" />
        <ParticipationKpi label="Confirmed" value={formatCount(count("confirmed"))} tone="danger" />
        <ParticipationKpi label="Dismissed" value={formatCount(count("dismissed"))} />
        <ParticipationKpi
          label="Silent polling units"
          value={formatCount(silent.length)}
          hint="Register loaded, no report received"
          tone={silent.length ? "warning" : "default"}
        />
      </div>

      <Panel title="Anomaly mix">
        {mix.length === 0 ? (
          <ParticipationEmpty message="No anomalies detected." />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {mix.map(([type, n]) => (
              <li
                key={type}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-xs"
              >
                <span>{ANOMALY_LABELS[type as keyof typeof ANOMALY_LABELS] ?? titleCase(type)}</span>
                <span className="font-semibold tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Anomaly queue">
        {queue.length === 0 ? (
          <ParticipationEmpty
            message="Nothing in this queue."
            hint="Anomalies are raised at submission time and by reconciliation, never by guesswork."
          />
        ) : (
          <ul className="space-y-2">
            {queue.slice(0, QUEUE_LIMIT).map((a) => {
              const row = a.polling_unit_id ? byId.get(a.polling_unit_id) : undefined;
              return (
                <li key={a.id} className="rounded-lg border border-border/60 p-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill
                      value={a.severity}
                      tone={["critical", "high"].includes(a.severity) ? "destructive" : "warning"}
                    />
                    <span className="font-semibold">
                      {ANOMALY_LABELS[a.anomaly_type] ?? titleCase(a.anomaly_type)}
                    </span>
                    <StatusPill
                      value={a.status}
                      tone={
                        a.status === "confirmed"
                          ? "destructive"
                          : a.status === "dismissed"
                            ? "muted"
                            : "warning"
                      }
                    />
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {formatRelative(a.detected_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {row
                      ? `${row.inec_pu_id} · ${row.ward}, ${row.lga}, ${row.state}`
                      : "Unlinked polling unit"}{" "}
                    — {a.detail}
                  </p>
                  {mayReview && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {ANOMALY_STATUSES.filter((s) => s !== a.status).map((s) => (
                        <Button key={s} size="sm" variant="ghost" onClick={() => apply(a.id, s)}>
                          {titleCase(s)}
                        </Button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Silent polling units">
        {silent.length === 0 ? (
          <ParticipationEmpty message="Every polling unit with a register baseline has reported." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-xs">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Polling unit</th>
                  <th className="py-2 pr-3 font-medium">Location</th>
                  <th className="py-2 pr-3 text-right font-medium">Registered</th>
                </tr>
              </thead>
              <tbody>
                {silent.slice(0, QUEUE_LIMIT).map((row) => (
                  <tr key={row.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-3 font-semibold">{row.inec_pu_id}</td>
                    <td className="py-2 pr-3 text-[11px] text-muted-foreground">
                      {row.ward} · {row.lga} · {row.state}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {formatCount(row.registered)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </ParticipationShell>
  );
}
