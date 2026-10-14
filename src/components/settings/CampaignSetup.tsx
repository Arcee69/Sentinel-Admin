import { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";
import { Flag, Loader2, Pencil, Plus } from "lucide-react";
import { Panel } from "../ui/Panel";
import { Badge, type BadgeTone } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Input, Select } from "../ui/Field";
import { FormRow } from "./FormRow";
import { SETUP_STATUSES, STATE_OPTIONS, type CampaignRecord, type SetupStatus } from "./model";
import { CAMPAIGNS, type Campaign } from "../../lib/campaigns";
import { useFilters } from "../../context/FilterContext";
import { cn } from "../../lib/cn";

const STATUS_TONES: Record<SetupStatus, BadgeTone> = {
  draft: "muted",
  active: "success",
  paused: "warning",
  archived: "muted",
};

/** Scope picker values besides a state name. */
const NATIONAL = "";
const KEEP_SCOPE = "__keep__";

interface FormValues {
  name: string;
  party: string;
  candidate: string;
  office: string;
  cycle: string;
  scope: string;
  status: SetupStatus;
  startDate: string;
  endDate: string;
}

const EMPTY_FORM: FormValues = {
  name: "",
  party: "",
  candidate: "",
  office: "",
  cycle: "2027",
  scope: NATIONAL,
  status: "active",
  startDate: "",
  endDate: "",
};

const schema = Yup.object({
  name: Yup.string().trim().required("Campaign name is required."),
  party: Yup.string().trim().required("Party is required."),
  cycle: Yup.string().trim().required("Cycle is required."),
  endDate: Yup.string().test(
    "after-start",
    "End date must be on or after the start date.",
    function (end) {
      const { startDate } = this.parent as FormValues;
      return !end || !startDate || end >= startDate;
    },
  ),
});

/** A multi-state campaign (e.g. Northern zones) can't be expressed by the single-state picker. */
function scopeOf(c: CampaignRecord): string {
  if (!c.states) return NATIONAL;
  return c.states.length === 1 ? c.states[0] : KEEP_SCOPE;
}

function toForm(c: CampaignRecord): FormValues {
  return {
    name: c.name,
    party: c.party,
    candidate: c.candidate,
    office: c.office,
    cycle: c.cycle,
    scope: scopeOf(c),
    status: c.status,
    startDate: c.startDate,
    endDate: c.endDate,
  };
}

function applyScope(scope: string, prev?: CampaignRecord): Pick<Campaign, "states" | "scopeLabel"> {
  if (scope === KEEP_SCOPE && prev) return { states: prev.states, scopeLabel: prev.scopeLabel };
  if (scope === NATIONAL) return { states: null, scopeLabel: "36 states + FCT" };
  return { states: [scope], scopeLabel: `${scope} only` };
}

interface Props {
  campaigns: CampaignRecord[];
  onSave: (campaign: CampaignRecord, isNew: boolean) => void;
  isAdmin: boolean;
  className?: string;
}

export function CampaignSetup({ campaigns, onSave, isAdmin, className }: Props) {
  const { campaignId, setCampaign } = useFilters();
  // `null` = closed, "new" = create, otherwise the record being edited.
  const [editing, setEditing] = useState<CampaignRecord | "new" | null>(null);
  const current = editing === "new" ? undefined : (editing ?? undefined);

  const formik = useFormik<FormValues>({
    initialValues: EMPTY_FORM,
    validationSchema: schema,
    onSubmit: async (values) => {
      // No campaigns API yet — the pause stands in for the round trip.
      await new Promise((r) => setTimeout(r, 450));

      const record: CampaignRecord = {
        id: current?.id ?? `c-${Date.now()}`,
        name: values.name.trim(),
        party: values.party.trim(),
        candidate: values.candidate.trim(),
        office: values.office.trim(),
        cycle: values.cycle.trim(),
        status: values.status,
        startDate: values.startDate,
        endDate: values.endDate,
        ...applyScope(values.scope, current),
      };

      onSave(record, !current);
      toast.success("Campaign saved");
      setEditing(null);
    },
  });

  // Opening the dialog should never show the previous attempt's values or errors.
  useEffect(() => {
    if (editing) formik.resetForm({ values: editing === "new" ? EMPTY_FORM : toForm(editing) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function fieldError(name: keyof FormValues) {
    return formik.touched[name] && formik.errors[name] ? formik.errors[name] : undefined;
  }

  const close = () => !formik.isSubmitting && setEditing(null);

  return (
    <Panel
      title="Campaign Setup"
      subtitle="Campaigns this account can command"
      icon={<Flag className="h-4 w-4" />}
      className={className}
      bodyClassName="p-0"
    >
      {campaigns.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">No campaigns yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {campaigns.map((c) => {
            const commanding = c.id === campaignId;
            // The global campaign filter only knows the seeded campaigns until
            // campaigns come from the API.
            const switchable = CAMPAIGNS.some((k) => k.id === c.id);
            const meta = [c.party, c.cycle, c.office, c.candidate, c.scopeLabel].filter(Boolean);

            return (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/30 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[13px] font-semibold">{c.name}</p>
                    <Badge tone={STATUS_TONES[c.status]}>{c.status}</Badge>
                    {commanding && (
                      <Badge tone="primary" dot>
                        In command
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{meta.join(" · ")}</p>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={commanding ? "outline" : "subtle"}
                    disabled={commanding || !switchable}
                    title={switchable ? undefined : "Available once campaigns load from the API"}
                    onClick={() => {
                      setCampaign(c.id);
                      toast.success(`Switched command to "${c.name}".`);
                    }}
                  >
                    {commanding ? "Current" : "Activate"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-border p-4 sm:p-5">
        {isAdmin ? (
          <Button variant="subtle" className="w-full" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" />
            Create New Campaign
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Only National Admins can create or edit campaigns.
          </p>
        )}
      </div>

      <Modal
        open={editing !== null}
        onClose={close}
        title={current ? "Edit campaign" : "New campaign"}
        description={current ? current.name : "Set up a campaign this account can command."}
        icon={<Flag className="h-4.5 w-4.5" />}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={close} disabled={formik.isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => formik.handleSubmit()}
              disabled={formik.isSubmitting}
            >
              {formik.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {formik.isSubmitting ? "Saving…" : "Save campaign"}
            </Button>
          </div>
        }
      >
        <form onSubmit={formik.handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormRow
            label="Campaign name *"
            htmlFor="cs-name"
            error={fieldError("name")}
            className="sm:col-span-2"
          >
            <Input
              id="cs-name"
              name="name"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              aria-invalid={!!fieldError("name")}
              className={cn(fieldError("name") && "border-destructive/60")}
            />
          </FormRow>

          <FormRow label="Party *" htmlFor="cs-party" error={fieldError("party")}>
            <Input
              id="cs-party"
              name="party"
              value={formik.values.party}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              aria-invalid={!!fieldError("party")}
              className={cn(fieldError("party") && "border-destructive/60")}
            />
          </FormRow>

          <FormRow label="Candidate" htmlFor="cs-candidate">
            <Input
              id="cs-candidate"
              name="candidate"
              value={formik.values.candidate}
              onChange={formik.handleChange}
            />
          </FormRow>

          <FormRow label="Office" htmlFor="cs-office">
            <Input
              id="cs-office"
              name="office"
              placeholder="e.g. Governor"
              value={formik.values.office}
              onChange={formik.handleChange}
            />
          </FormRow>

          <FormRow label="Cycle *" htmlFor="cs-cycle" error={fieldError("cycle")}>
            <Input
              id="cs-cycle"
              name="cycle"
              value={formik.values.cycle}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              aria-invalid={!!fieldError("cycle")}
              className={cn(fieldError("cycle") && "border-destructive/60")}
            />
          </FormRow>

          <FormRow label="Scope" htmlFor="cs-scope">
            <Select
              id="cs-scope"
              name="scope"
              value={formik.values.scope}
              onChange={formik.handleChange}
              className="h-10 w-full"
            >
              {current && scopeOf(current) === KEEP_SCOPE && (
                <option value={KEEP_SCOPE}>{current.scopeLabel}</option>
              )}
              <option value={NATIONAL}>National</option>
              {STATE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FormRow>

          <FormRow label="Status" htmlFor="cs-status">
            <Select
              id="cs-status"
              name="status"
              value={formik.values.status}
              onChange={formik.handleChange}
              className="h-10 w-full capitalize"
            >
              {SETUP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FormRow>

          <FormRow label="Start date" htmlFor="cs-start">
            <Input
              id="cs-start"
              name="startDate"
              type="date"
              value={formik.values.startDate}
              onChange={formik.handleChange}
            />
          </FormRow>

          <FormRow label="End date" htmlFor="cs-end" error={fieldError("endDate")}>
            <Input
              id="cs-end"
              name="endDate"
              type="date"
              value={formik.values.endDate}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              aria-invalid={!!fieldError("endDate")}
              className={cn(fieldError("endDate") && "border-destructive/60")}
            />
          </FormRow>

          {/* Submit on Enter without a visible duplicate button. */}
          <button type="submit" className="hidden" tabIndex={-1} aria-hidden />
        </form>
      </Modal>
    </Panel>
  );
}
