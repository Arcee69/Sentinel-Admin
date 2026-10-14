import { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";
import { Loader2, Plus, UserPlus, Users } from "lucide-react";
import { Panel } from "../ui/Panel";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Input, Select } from "../ui/Field";
import { FormRow } from "./FormRow";
import { STATE_OPTIONS } from "./model";
import {
  PLATFORM_ROLES,
  PLATFORM_USERS,
  ROLE_LABELS,
  type PlatformRole,
  type PlatformUser,
} from "../../lib/data";
import { cn } from "../../lib/cn";

/** Accepts 0803… / +234803… / 234803…, ignoring spaces, dashes and brackets. */
const PHONE_RE = /^(?:\+?234|0)[789]\d{9}$/;
const stripPhone = (v: string) => v.replace(/[\s()-]/g, "");

const lastLogin = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "Never");

export function UsersPanel() {
  const [users, setUsers] = useState<PlatformUser[]>(PLATFORM_USERS);
  const [adding, setAdding] = useState(false);

  function updateAccess(id: string, patch: Pick<PlatformUser, "role" | "assignedState">) {
    // No users API yet — access changes apply to the local roster only.
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    toast.success("Access updated");
  }

  return (
    <Panel
      title="Admins & Users"
      subtitle="Assign roles and state scope"
      icon={<Users className="h-4 w-4" />}
      action={
        <Button size="sm" variant="primary" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add user
        </Button>
      }
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-180 text-left text-[13px]">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 font-medium sm:px-5">Name</th>
              <th className="px-3 py-2.5 font-medium">Email</th>
              <th className="px-3 py-2.5 font-medium">Role</th>
              <th className="px-3 py-2.5 font-medium">State</th>
              <th className="px-3 py-2.5 font-medium sm:pr-5">Last login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-secondary/30">
                <td className="px-4 py-2 font-medium sm:px-5">{u.fullName}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{u.email}</td>
                <td className="px-3 py-2">
                  <Select
                    aria-label={`Role for ${u.fullName}`}
                    className="h-8 w-44 text-xs"
                    value={u.role}
                    onChange={(e) =>
                      updateAccess(u.id, {
                        role: e.target.value as PlatformRole,
                        assignedState: u.assignedState,
                      })
                    }
                  >
                    {PLATFORM_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <Select
                    aria-label={`State for ${u.fullName}`}
                    className="h-8 w-36 text-xs"
                    value={u.assignedState ?? ""}
                    onChange={(e) =>
                      updateAccess(u.id, { role: u.role, assignedState: e.target.value || null })
                    }
                  >
                    <option value="">All / none</option>
                    {STATE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground sm:pr-5">
                  {lastLogin(u.lastLoginAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddUserModal
        open={adding}
        onClose={() => setAdding(false)}
        existingEmails={users.map((u) => u.email.toLowerCase())}
        onCreate={(user) => {
          setUsers((list) => [...list, user]);
          toast.success("User created");
        }}
      />
    </Panel>
  );
}

const EMPTY_USER = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  role: "observer" as PlatformRole,
  assignedState: "",
};

function AddUserModal({
  open,
  onClose,
  existingEmails,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  existingEmails: string[];
  onCreate: (user: PlatformUser) => void;
}) {
  const formik = useFormik({
    initialValues: EMPTY_USER,
    validationSchema: Yup.object({
      fullName: Yup.string().trim().required("Full name is required."),
      email: Yup.string()
        .trim()
        .email("Enter a valid email address.")
        .required("Email is required.")
        .test("unique", "A user with this email already exists.", (v) =>
          v ? !existingEmails.includes(v.trim().toLowerCase()) : true,
        ),
      phone: Yup.string().test("ng-phone", "Enter a valid Nigerian phone number.", (v) =>
        v ? PHONE_RE.test(stripPhone(v)) : true,
      ),
      password: Yup.string()
        .min(10, "Use at least 10 characters.")
        .required("Temporary password is required."),
      role: Yup.string().oneOf([...PLATFORM_ROLES]).required(),
    }),
    onSubmit: async (values) => {
      // No users API yet — the pause stands in for the round trip.
      await new Promise((r) => setTimeout(r, 550));

      onCreate({
        id: `u-${Date.now()}`,
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone ? stripPhone(values.phone) : null,
        role: values.role,
        assignedState: values.assignedState || null,
        lastLoginAt: null,
      });
      onClose();
    },
  });

  // Reopening should never show the previous attempt's values or errors.
  useEffect(() => {
    if (open) formik.resetForm({ values: EMPTY_USER });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function fieldError(name: keyof typeof formik.values) {
    return formik.touched[name] && formik.errors[name] ? formik.errors[name] : undefined;
  }

  const close = () => !formik.isSubmitting && onClose();

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add user"
      description="Create a platform account and assign its role and state scope."
      icon={<UserPlus className="h-4.5 w-4.5" />}
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
            {formik.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {formik.isSubmitting ? "Creating…" : "Create user"}
          </Button>
        </div>
      }
    >
      <form onSubmit={formik.handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <FormRow
          label="Full name *"
          htmlFor="au-name"
          error={fieldError("fullName")}
          className="sm:col-span-2"
        >
          <Input
            id="au-name"
            name="fullName"
            autoComplete="name"
            value={formik.values.fullName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            aria-invalid={!!fieldError("fullName")}
            className={cn(fieldError("fullName") && "border-destructive/60")}
          />
        </FormRow>

        <FormRow label="Email *" htmlFor="au-email" error={fieldError("email")}>
          <Input
            id="au-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@smhp.ng"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            aria-invalid={!!fieldError("email")}
            className={cn(fieldError("email") && "border-destructive/60")}
          />
        </FormRow>

        <FormRow label="Phone" htmlFor="au-phone" error={fieldError("phone")}>
          <Input
            id="au-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0803 123 4567"
            value={formik.values.phone}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            aria-invalid={!!fieldError("phone")}
            className={cn(fieldError("phone") && "border-destructive/60")}
          />
        </FormRow>

        <FormRow
          label="Temporary password * (min 10)"
          htmlFor="au-password"
          error={fieldError("password")}
          className="sm:col-span-2"
        >
          <Input
            id="au-password"
            name="password"
            type="text"
            autoComplete="off"
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            aria-invalid={!!fieldError("password")}
            className={cn(fieldError("password") && "border-destructive/60")}
          />
        </FormRow>

        <FormRow label="Role" htmlFor="au-role">
          <Select
            id="au-role"
            name="role"
            value={formik.values.role}
            onChange={formik.handleChange}
            className="h-10 w-full"
          >
            {PLATFORM_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </FormRow>

        <FormRow label="Assigned state" htmlFor="au-state">
          <Select
            id="au-state"
            name="assignedState"
            value={formik.values.assignedState}
            onChange={formik.handleChange}
            className="h-10 w-full"
          >
            <option value="">All / none</option>
            {STATE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </FormRow>

        {/* Submit on Enter without a visible duplicate button. */}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden />
      </form>
    </Modal>
  );
}
