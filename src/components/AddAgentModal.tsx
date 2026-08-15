import { useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { AlertCircle, Loader2, MapPin, Phone, Mail, UserPlus } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Input, Label, Select } from "./ui/Field";
import { useFilters } from "../context/FilterContext";
import { AGENT_ROLES, LGAS_BY_STATE, type Agent, type AgentRole } from "../lib/data";
import { cn } from "../lib/cn";

/** Accepts 0803… / +234803… / 234803…, ignoring spaces, dashes and brackets. */
const PHONE_RE = /^(?:\+?234|0)[789]\d{9}$/;
const stripPhone = (v: string) => v.replace(/[\s()-]/g, "");

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
  role: Yup.string().oneOf([...AGENT_ROLES], "Select a role.").required("Role is required."),
  state: Yup.string().required("Select a state."),
  lga: Yup.string().required("Select an LGA."),
});

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (agent: Agent) => void;
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function AddAgentModal({ open, onClose, onCreate }: Props) {
  const { availableStates, scope, isNationwide } = useFilters();

  // Pre-fill the location from the active scope — that is almost always the
  // state the operator is provisioning for.
  const defaultState = !isNationwide && availableStates.includes(scope) ? scope : "";

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
      // No API yet — the pause stands in for the round trip.
      await new Promise((r) => setTimeout(r, 550));

      onCreate({
        id: `ag-${Date.now()}`,
        initials: initialsFrom(values.name),
        name: values.name.trim(),
        role: values.role as AgentRole,
        state: values.state,
        lga: values.lga,
        email: values.email.trim(),
        phone: stripPhone(values.phone),
        reports: 0,
        taskPct: 0,
        status: "active",
      });

      helpers.resetForm();
      onClose();
    },
  });

  // Reopening should never show the previous attempt's values or errors.
  useEffect(() => {
    if (open) formik.resetForm({ values: { ...formik.initialValues, state: defaultState } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultState]);

  const lgas = formik.values.state ? LGAS_BY_STATE[formik.values.state] : undefined;

  function fieldError(name: keyof typeof formik.values) {
    return formik.touched[name] && formik.errors[name] ? formik.errors[name] : undefined;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Agent"
      description="Provision a field agent for the roster."
      icon={<UserPlus className="h-4.5 w-4.5" />}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={formik.isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => formik.handleSubmit()}
            disabled={formik.isSubmitting}
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

        <FormRow label="Role" htmlFor="role" error={fieldError("role")}>
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
                {availableStates.map((s) => (
                  <option key={s} value={s}>
                    {s}
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
                <option value="">{lgas ? "Select an LGA…" : "Pick a state first"}</option>
                {lgas?.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </FormRow>
          </div>
        </fieldset>

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
