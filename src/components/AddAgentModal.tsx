import { useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { AlertCircle, Loader2, MapPin, Phone, Mail, UserPlus } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Input, Label, Select } from "./ui/Field";
import { useFilters } from "../context/FilterContext";
import { useAuth } from "../context/AuthContext";
import { useGeoUnits } from "../hooks/api/useGeography";
import { useInviteAgent, type AgentInvitation } from "../hooks/api/useAgents";
import { AGENT_ROLES, type AgentRole } from "../lib/data";
import { errorMessage, toApiError } from "../services/errors";
import { cn } from "../lib/cn";

/** Accepts 0803… / +234803… / 234803…, ignoring spaces, dashes and brackets. */
const PHONE_RE = /^(?:\+?234|0)[789]\d{9}$/;
const stripPhone = (v: string) => v.replace(/[\s()-]/g, "");
/** The API stores phones in international form, e.g. +2348031234567. */
const toE164 = (v: string) => {
  const p = stripPhone(v);
  if (p.startsWith("+")) return p;
  if (p.startsWith("234")) return `+${p}`;
  return `+234${p.slice(1)}`;
};

const schema = Yup.object({
  name: Yup.string()
    .trim()
    .min(3, "Enter the agent's full name.")
    .matches(/\s/, "Include both first and last name.")
    .required("Full name is required."),
  email: Yup.string()
    .trim()
    .email("Enter a valid email address.")
    .required("Email is required."),
  phone: Yup.string()
    .required("Phone number is required.")
    .test("ng-phone", "Enter a valid Nigerian phone number.", (v) =>
      v ? PHONE_RE.test(stripPhone(v)) : false,
    ),
  role: Yup.string().oneOf(["", ...AGENT_ROLES], "Select a role."),
  state: Yup.string().required("Select a state."),
  lga: Yup.string().required("Select an LGA."),
});

/** API field → form field, for placing 422 messages. */
const FIELD_FOR: Record<string, string> = {
  name: "name",
  email: "email",
  phone: "phone",
  home_geographic_unit_id: "lga",
};

interface Props {
  open: boolean;
  onClose: () => void;
  /** The created invitation, including its one-time token. */
  onCreate: (invitation: AgentInvitation, duty: AgentRole | "") => void;
}

export function AddAgentModal({ open, onClose, onCreate }: Props) {
  const { apiCampaign, stateUnits, scopeUnit } = useFilters();
  const { activeOrganization } = useAuth();
  const invite = useInviteAgent(activeOrganization?.organization.id);
  const versionId = apiCampaign?.geography_version_id;

  // Pre-fill the location from the active scope — that is almost always the
  // state the operator is provisioning for.
  const defaultState = scopeUnit?.id ?? "";

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      phone: "",
      role: "" as AgentRole | "",
      state: defaultState,
      lga: "",
    },
    validationSchema: schema,
    onSubmit: async (values, helpers) => {
      try {
        const invitation = await invite.mutateAsync({
          name: values.name.trim(),
          email: values.email.trim(),
          role: "agent",
          phone: toE164(values.phone),
          geography_version_id: versionId!,
          home_geographic_unit_id: values.lga,
        });
        onCreate(invitation, values.role);
        helpers.resetForm();
        onClose();
      } catch (err) {
        const e = toApiError(err);
        const placed = Object.entries(e.fieldErrors).filter(([k]) => FIELD_FOR[k]);
        if (e.isValidation && placed.length) {
          for (const [k, msg] of placed) helpers.setFieldError(FIELD_FOR[k], msg);
          helpers.setTouched(Object.fromEntries(placed.map(([k]) => [FIELD_FOR[k], true])), false);
        } else {
          helpers.setStatus(errorMessage(e));
        }
      }
    },
  });

  // Reopening should never show the previous attempt's values or errors.
  useEffect(() => {
    if (open) formik.resetForm({ values: { ...formik.initialValues, state: defaultState } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultState]);

  const lgaQuery = useGeoUnits(formik.values.state ? versionId : undefined, formik.values.state);
  const lgas = formik.values.state ? lgaQuery.data : undefined;

  function fieldError(name: keyof typeof formik.values) {
    return formik.touched[name] && formik.errors[name] ? formik.errors[name] : undefined;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Agent"
      description="Invite a field agent. They join once they accept the invitation."
      icon={<UserPlus className="h-4.5 w-4.5" />}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={formik.isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => formik.handleSubmit()}
            disabled={formik.isSubmitting || !activeOrganization}
          >
            {formik.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Add Agent
          </Button>
        </div>
      }
    >
      <form onSubmit={formik.handleSubmit} className="space-y-4" noValidate>
        <FormRow label="Full name" htmlFor="name" error={fieldError("name")}>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="e.g. Adekunle Omotayo"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            aria-invalid={!!fieldError("name")}
            className={fieldError("name") ? "border-destructive/60" : undefined}
          />
        </FormRow>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Email" htmlFor="email" error={fieldError("email")}>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="agent@smhp.ng"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                aria-invalid={!!fieldError("email")}
                className={cn("pl-9", fieldError("email") && "border-destructive/60")}
              />
            </div>
          </FormRow>

          <FormRow label="Phone number" htmlFor="phone" error={fieldError("phone")}>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0803 123 4567"
                value={formik.values.phone}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                aria-invalid={!!fieldError("phone")}
                className={cn("pl-9", fieldError("phone") && "border-destructive/60")}
              />
            </div>
          </FormRow>
        </div>

        <FormRow label="Duty when assigned" htmlFor="role" error={fieldError("role")}>
          <Select
            id="role"
            name="role"
            value={formik.values.role}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            aria-invalid={!!fieldError("role")}
            className={cn("h-10 w-full", fieldError("role") && "border-destructive/60")}
          >
            <option value="">Select a role…</option>
            {AGENT_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          <p className="text-[10px] text-muted-foreground">
            Applied when the agent accepts and is assigned to a campaign — invitations don't
            carry a duty.
          </p>
        </FormRow>

        <fieldset className="space-y-2">
          <legend className="flex items-center gap-1.5 text-xs font-medium text-foreground/90">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            Location
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormRow label="State" htmlFor="state" error={fieldError("state")}>
              <Select
                id="state"
                name="state"
                value={formik.values.state}
                onBlur={formik.handleBlur}
                onChange={(e) => {
                  formik.setFieldValue("state", e.target.value);
                  // The previous LGA belongs to the old state.
                  formik.setFieldValue("lga", "");
                }}
                aria-invalid={!!fieldError("state")}
                className={cn("h-10 w-full", fieldError("state") && "border-destructive/60")}
              >
                <option value="">Select a state…</option>
                {stateUnits.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </FormRow>

            <FormRow label="LGA" htmlFor="lga" error={fieldError("lga")}>
              <Select
                id="lga"
                name="lga"
                disabled={!lgas}
                value={formik.values.lga}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                aria-invalid={!!fieldError("lga")}
                className={cn(
                  "h-10 w-full",
                  fieldError("lga") && "border-destructive/60",
                  !lgas && "opacity-60",
                )}
              >
                <option value="">
                  {lgas
                    ? "Select an LGA…"
                    : formik.values.state && lgaQuery.isLoading
                      ? "Loading LGAs…"
                      : "Pick a state first"}
                </option>
                {lgas?.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </FormRow>
          </div>
        </fieldset>

        {typeof formik.status === "string" && (
          <p role="alert" className="flex items-center gap-1 text-[11px] text-destructive">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {formik.status}
          </p>
        )}

        {/* Submit on Enter without a visible duplicate button. */}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden />
      </form>
    </Modal>
  );
}

function FormRow({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && (
        <p role="alert" className="flex items-center gap-1 text-[11px] text-destructive">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
