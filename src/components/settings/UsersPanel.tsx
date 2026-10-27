import { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";
import { useQueries } from "@tanstack/react-query";
import { Loader2, Plus, UserPlus, Users } from "lucide-react";
import { Panel } from "../ui/Panel";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Input, Select } from "../ui/Field";
import { ErrorState, LoadingRows } from "../ui/AsyncState";
import { FormRow } from "./FormRow";
import { InvitationCodeDialog, type CreatedInvitation } from "../InvitationCodeDialog";
import { useAuth } from "../../context/AuthContext";
import { useFilters } from "../../context/FilterContext";
import { useMemberships } from "../../hooks/api/usePeople";
import { useInviteAgent } from "../../hooks/api/useAgents";
import {
  useGeographicGrants,
  useSetGrant,
  useUpdateMembership,
} from "../../hooks/api/useSettings";
import { organizationApi } from "../../services/organization";
import { errorMessage, toApiError } from "../../services/errors";
import { cn } from "../../lib/cn";

/** Accepts 0803… / +234803… / 234803…, ignoring spaces, dashes and brackets. */
const PHONE_RE = /^(?:\+?234|0)[789]\d{9}$/;
const stripPhone = (v: string) => v.replace(/[\s()-]/g, "");
const toE164 = (v: string) => {
  const p = stripPhone(v);
  if (p.startsWith("+")) return p;
  if (p.startsWith("234")) return `+${p}`;
  return `+234${p.slice(1)}`;
};

/** Organization roles the API accepts, with their display labels. */
const ROLES = [
  { value: "admin", label: "Administrator" },
  { value: "manager", label: "Campaign Manager" },
  { value: "observer", label: "Observer" },
  { value: "agent", label: "Field Agent" },
] as const;

/** Staff (not agents) are invited from here; agents come from Agents & Structure. */
const INVITE_ROLES = ROLES.filter((r) => r.value === "manager" || r.value === "observer");

const lastLogin = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString() : "—";

export function UsersPanel() {
  const { apiUser, activeOrganization } = useAuth();
  const { apiCampaign, stateUnits } = useFilters();
  const organizationId = activeOrganization?.organization.id;
  const membershipsQuery = useMemberships(organizationId);
  const grantsQuery = useGeographicGrants(apiCampaign?.id);
  const updateMembership = useUpdateMembership(organizationId);
  const setGrant = useSetGrant(apiCampaign?.id);
  const [adding, setAdding] = useState(false);
  const [invited, setInvited] = useState<CreatedInvitation | null>(null);

  const memberships = useMemo(() => membershipsQuery.data ?? [], [membershipsQuery.data]);

  // Memberships carry no names or emails. Agents' identities come from their
  // campaign profiles; the signed-in user's from the session.
  const agentProfiles = useQueries({
    queries: memberships
      .filter((m) => m.role === "agent")
      .map((m) => ({
        queryKey: ["campaign", apiCampaign?.id, "agent", m.id],
        queryFn: async () => (await organizationApi.agent(apiCampaign!.id, m.id)).data,
        enabled: !!apiCampaign,
        retry: false,
      })),
  });
  const people = useMemo(() => {
    const map = new Map<string, { name: string; email: string; lastLoginAt: string | null }>();
    for (const q of agentProfiles) {
      const d = q.data;
      if (d) map.set(d.membership_id, { name: d.user.name, email: d.user.email, lastLoginAt: d.user.last_login_at });
    }
    if (apiUser && activeOrganization) {
      map.set(activeOrganization.membership.id, {
        name: apiUser.name,
        email: apiUser.email,
        lastLoginAt: apiUser.last_login_at,
      });
    }
    return map;
  }, [agentProfiles, apiUser, activeOrganization]);

  /** Active grant IDs and the state they point at, per membership. */
  const grantsByMember = useMemo(() => {
    const map = new Map<string, { ids: string[]; unitId: string }>();
    for (const g of grantsQuery.data ?? []) {
      if (g.revoked_at) continue;
      const entry = map.get(g.membership_id) ?? { ids: [], unitId: g.geographic_unit_id };
      entry.ids.push(g.id);
      map.set(g.membership_id, entry);
    }
    return map;
  }, [grantsQuery.data]);

  function changeRole(membershipId: string, role: string, status: string) {
    updateMembership.mutate(
      { membershipId, role, status },
      {
        onSuccess: () => toast.success("Access updated"),
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  }

  function changeState(membershipId: string, unitId: string | null) {
    setGrant.mutate(
      { membershipId, current: grantsByMember.get(membershipId)?.ids ?? [], unitId },
      {
        onSuccess: () => toast.success("State scope updated"),
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  }

  return (
    <Panel
      title="Admins & Users"
      subtitle="Assign roles and state scope"
      icon={<Users className="h-4 w-4" />}
      action={
        <Button size="sm" variant="primary" onClick={() => setAdding(true)} disabled={!apiCampaign}>
          <Plus className="h-3.5 w-3.5" />
          Add user
        </Button>
      }
      bodyClassName="p-0"
    >
      {membershipsQuery.isLoading ? (
        <LoadingRows rows={4} />
      ) : membershipsQuery.isError ? (
        <ErrorState error={membershipsQuery.error} onRetry={() => membershipsQuery.refetch()} />
      ) : (
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
              {memberships.map((m) => {
                const person = people.get(m.id);
                const self = m.id === activeOrganization?.membership.id;
                const grant = grantsByMember.get(m.id);
                const busy =
                  (updateMembership.isPending && updateMembership.variables?.membershipId === m.id) ||
                  (setGrant.isPending && setGrant.variables?.membershipId === m.id);
                return (
                  <tr key={m.id} className="transition-colors hover:bg-secondary/30">
                    <td className="px-4 py-2 font-medium sm:px-5">
                      {person?.name ?? (
                        <span className="font-normal text-muted-foreground">Name not provided</span>
                      )}
                      {self && <span className="ml-1.5 text-[10px] text-muted-foreground">(you)</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{person?.email ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Select
                        aria-label={`Role for ${person?.name ?? "member"}`}
                        className="h-8 w-44 text-xs"
                        value={m.role}
                        // Changing your own role could lock you out of this page.
                        disabled={self || busy}
                        title={self ? "You can't change your own role" : undefined}
                        onChange={(e) => changeRole(m.id, e.target.value, m.status)}
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        aria-label={`State for ${person?.name ?? "member"}`}
                        className="h-8 w-36 text-xs"
                        value={grant?.unitId ?? ""}
                        disabled={busy || !apiCampaign}
                        onChange={(e) => changeState(m.id, e.target.value || null)}
                      >
                        <option value="">All / none</option>
                        {stateUnits.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground sm:pr-5">
                      {lastLogin(person?.lastLoginAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddUserModal
        open={adding}
        onClose={() => setAdding(false)}
        onCreate={(invitation) => {
          setInvited(invitation);
          toast.success(`Invitation created for ${invitation.name}.`);
        }}
      />
      <InvitationCodeDialog invitation={invited} onClose={() => setInvited(null)}>
        <p className="text-[11px] text-muted-foreground">
          They join {apiCampaign?.name ?? "this campaign"} once they accept; set their state scope
          here afterwards.
        </p>
      </InvitationCodeDialog>
    </Panel>
  );
}

const EMPTY_USER = {
  fullName: "",
  email: "",
  phone: "",
  role: "observer",
};

function AddUserModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (invitation: CreatedInvitation) => void;
}) {
  const { activeOrganization } = useAuth();
  const { apiCampaign } = useFilters();
  const invite = useInviteAgent(activeOrganization?.organization.id);

  const formik = useFormik({
    initialValues: EMPTY_USER,
    validationSchema: Yup.object({
      fullName: Yup.string().trim().required("Full name is required."),
      email: Yup.string().trim().email("Enter a valid email address.").required("Email is required."),
      phone: Yup.string().test("ng-phone", "Enter a valid Nigerian phone number.", (v) =>
        v ? PHONE_RE.test(stripPhone(v)) : true,
      ),
      role: Yup.string()
        .oneOf(INVITE_ROLES.map((r) => r.value))
        .required(),
    }),
    onSubmit: async (values, helpers) => {
      try {
        const invitation = await invite.mutateAsync({
          name: values.fullName.trim(),
          email: values.email.trim(),
          role: values.role,
          phone: values.phone ? toE164(values.phone) : undefined,
          // Managers and observers are invited into a campaign.
          campaign_id: apiCampaign!.id,
        });
        onCreate(invitation);
        onClose();
      } catch (err) {
        const e = toApiError(err);
        const map: Record<string, string> = { name: "fullName", email: "email", phone: "phone", role: "role" };
        const placed = Object.entries(e.fieldErrors).filter(([k]) => map[k]);
        if (e.isValidation && placed.length) {
          for (const [k, msg] of placed) helpers.setFieldError(map[k], msg);
          helpers.setTouched(Object.fromEntries(placed.map(([k]) => [map[k], true])), false);
        } else {
          helpers.setStatus(errorMessage(e));
        }
      }
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
      description={`Invite a manager or observer to ${apiCampaign?.name ?? "this campaign"}. They set their own password when they accept.`}
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
            {formik.isSubmitting ? "Inviting…" : "Invite user"}
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

        <FormRow label="Role" htmlFor="au-role" error={fieldError("role")} className="sm:col-span-2">
          <Select
            id="au-role"
            name="role"
            value={formik.values.role}
            onChange={formik.handleChange}
            className="h-10 w-full"
          >
            {INVITE_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
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
  );
}
