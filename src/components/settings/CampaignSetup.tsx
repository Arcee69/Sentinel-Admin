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
import { LoadingRows } from "../ui/AsyncState";
import { FormRow } from "./FormRow";
import { SETUP_STATUSES } from "./model";
import { useFilters } from "../../context/FilterContext";
import { useAuth } from "../../context/AuthContext";
import { useSaveCampaign } from "../../hooks/api/useSettings";
import { useUnitNames } from "../../hooks/useUnitNames";
import { errorMessage, toApiError } from "../../services/errors";
import type { Campaign } from "../../services/settings";
import { cn } from "../../lib/cn";

const STATUS_TONES: Record<string, BadgeTone> = {
  draft: "muted",
  active: "success",
  paused: "warning",
  archived: "muted",
};

/** Scope picker value for "the whole country". */
const NATIONAL = "";

interface FormValues {
  name: string;
  party: string;
  candidate: string;
  office: string;
  cycle: string;
  scope: string;
  status: string;
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

/** API field → form field, for placing 422 messages. */
const FIELD_FOR: Record<string, keyof FormValues> = {
  name: "name",
  slug: "name",
  party: "party",
  candidate: "candidate",
  office: "office",
  cycle: "cycle",
  status: "status",
  starts_on: "startDate",
  ends_on: "endDate",
  scope_unit_ids: "scope",
};

/** "Lagos Gubernatorial Drive" → "lagos-gubernatorial-drive-x4k2"; the suffix avoids slug clashes. */
function slugFor(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base || "campaign"}-${Math.random().toString(36).slice(2, 6)}`;
}

function toForm(c: Campaign): FormValues {
  return {
    name: c.name,
    party: c.party ?? "",
    candidate: c.candidate ?? "",
    office: c.office ?? "",
    cycle: c.cycle ?? "",
    scope: NATIONAL,
    status: c.status,
    startDate: c.starts_on?.slice(0, 10) ?? "",
    endDate: c.ends_on?.slice(0, 10) ?? "",
  };
}

interface Props {
  campaigns: Campaign[];
  isLoading?: boolean;
  isAdmin: boolean;
  className?: string;
}

export function CampaignSetup({ campaigns, isLoading, isAdmin, className }: Props) {
  const { apiCampaign, campaigns: workspace, setCampaign, stateUnits, rootUnits } = useFilters();
  const { activeOrganization } = useAuth();
  const save = useSaveCampaign(activeOrganization?.organization.id);
  const unitName = useUnitNames();
  // `null` = closed, "new" = create, otherwise the record being edited.
  const [editing, setEditing] = useState<Campaign | "new" | null>(null);
  const current = editing === "new" ? undefined : (editing ?? undefined);

  const rootIds = new Set(rootUnits.map((r) => r.id));
  const scopeLabel = (c: Campaign) => {
    if (c.scope_unit_ids.some((id) => rootIds.has(id))) return "National";
    const names = c.scope_unit_ids.map((id) => unitName(id)).filter(Boolean);
    if (names.length === c.scope_unit_ids.length && names.length <= 2) return `${names.join(", ")} only`;
    return `${c.scope_unit_ids.length} area${c.scope_unit_ids.length === 1 ? "" : "s"}`;
  };

  const formik = useFormik<FormValues>({
    initialValues: EMPTY_FORM,
    validationSchema: schema,
    onSubmit: async (values, helpers) => {
      const fields = {
        name: values.name.trim(),
        party: values.party.trim(),
        candidate: values.candidate.trim() || undefined,
        office: values.office.trim() || undefined,
        cycle: values.cycle.trim(),
        status: values.status,
        starts_on: values.startDate || null,
        ends_on: values.endDate || null,
      };
      try {
        if (current) {
          await save.mutateAsync({
            kind: "update",
            campaignId: current.id,
            revision: current.revision,
            fields,
          });
        } else {
          await save.mutateAsync({
            kind: "create",
            fields,
            slug: slugFor(values.name),
            // New campaigns use the geography the current one is built on.
            geographyVersionId: apiCampaign!.geography_version_id,
            scopeUnitIds: values.scope ? [values.scope] : rootUnits.map((r) => r.id),
          });
        }
        toast.success("Campaign saved");
        setEditing(null);
      } catch (err) {
        const e = toApiError(err);
        const placed = Object.entries(e.fieldErrors).filter(([k]) => FIELD_FOR[k]);
        if (e.isValidation && placed.length) {
          for (const [k, msg] of placed) helpers.setFieldError(FIELD_FOR[k], msg);
          helpers.setTouched(Object.fromEntries(placed.map(([k]) => [FIELD_FOR[k], true])), false);
        } else if (e.isConflict) {
          helpers.setStatus("Someone else changed this campaign. Close and reopen it to edit the latest version.");
        } else {
          helpers.setStatus(errorMessage(e));
        }
      }
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
      {isLoading ? (
        <LoadingRows rows={2} />
      ) : campaigns.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">No campaigns yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {campaigns.map((c) => {
            const commanding = c.id === apiCampaign?.id;
            // Only campaigns this account can open in the back office can be activated.
            const switchable = workspace.some((k) => k.id === c.id);
            const meta = [c.party, c.cycle, c.office, c.candidate, scopeLabel(c)].filter(Boolean);

            return (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/30 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[13px] font-semibold">{c.name}</p>
                    <Badge tone={STATUS_TONES[c.status] ?? "muted"}>{c.status}</Badge>
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
                    title={switchable ? undefined : "You don't have back-office access to this campaign"}
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
            Only organization admins can create or edit campaigns.
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

          <FormRow label="Candidate" htmlFor="cs-candidate" error={fieldError("candidate")}>
            <Input
              id="cs-candidate"
              name="candidate"
              value={formik.values.candidate}
              onChange={formik.handleChange}
            />
          </FormRow>

          <FormRow label="Office" htmlFor="cs-office" error={fieldError("office")}>
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

          <FormRow label="Scope" htmlFor="cs-scope" error={fieldError("scope")}>
            {current ? (
              <>
                <Select id="cs-scope" disabled className="h-10 w-full opacity-70">
                  <option>{scopeLabel(current)}</option>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Scope is set when a campaign is created and can't be changed here.
                </p>
              </>
            ) : (
              <Select
                id="cs-scope"
                name="scope"
                value={formik.values.scope}
                onChange={formik.handleChange}
                className="h-10 w-full"
              >
                <option value={NATIONAL}>National</option>
                {stateUnits.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </FormRow>

          <FormRow label="Status" htmlFor="cs-status" error={fieldError("status")}>
            <Select
              id="cs-status"
              name="status"
              value={formik.values.status}
              onChange={formik.handleChange}
              className="h-10 w-full capitalize"
            >
              {(SETUP_STATUSES as readonly string[]).includes(formik.values.status) ? null : (
                <option value={formik.values.status}>{formik.values.status}</option>
              )}
              {SETUP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FormRow>

          <FormRow label="Start date" htmlFor="cs-start" error={fieldError("startDate")}>
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

          {typeof formik.status === "string" && (
            <p role="alert" className="text-[11px] text-destructive sm:col-span-2">
              {formik.status}
            </p>
          )}

          {/* Submit on Enter without a visible duplicate button. */}
          <button type="submit" className="hidden" tabIndex={-1} aria-hidden />
        </form>
      </Modal>
    </Panel>
  );
}
