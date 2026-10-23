import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  authApi,
  type ApiUser,
  type AuthContextData,
  type CampaignAccess,
  type CampaignRole,
  type ContextCampaign,
  type ContextOrganization,
} from "../services/auth";
import { ApiError } from "../services/errors";
import { UNAUTHORIZED_EVENT } from "../services/instance";
import { clearSession, getToken, readSession, saveSession } from "../services/session";
import { queryKeys } from "../lib/queryClient";

const WORKSPACE_KEY = "sentinel.workspace";
const DEVICE_NAME = "sentinel-admin-web";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  manager: "Campaign Manager",
  observer: "Observer",
  agent: "Field Agent",
};

function roleLabel(role: CampaignRole | undefined): string {
  if (!role) return "Member";
  return ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
}

interface SessionUser {
  id: string;
  name: string;
  initials: string;
  /** Display label for the role on the active campaign. */
  role: string;
  email: string;
}

/** A campaign the back office can open, with its organization attached. */
export interface WorkspaceCampaign extends ContextCampaign {
  organizationName: string;
  membershipId: string;
}

interface AuthValue {
  user: SessionUser | null;
  apiUser: ApiUser | null;
  /** A token is held; the context may still be loading. */
  isAuthenticated: boolean;
  /** `/auth/context` has loaded. */
  isReady: boolean;
  contextError: unknown;
  organizations: ContextOrganization[];
  /** Back-office campaigns across every organization. */
  campaigns: WorkspaceCampaign[];
  activeCampaign: WorkspaceCampaign | null;
  activeOrganization: ContextOrganization | null;
  access: CampaignAccess | null;
  selectCampaign: (id: string) => void;
  signIn: (email: string, password: string, remember: boolean) => Promise<void>;
  signOut: () => void;
  refreshContext: () => Promise<unknown>;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Field-only access (an agent with no command role) belongs in the PWA.
 * Managers and admins can manage; an observer gets read-only access.
 */
function isBackOffice(access: CampaignAccess): boolean {
  return access.can_manage || !access.can_work;
}

function workspaceCampaigns(data: AuthContextData | undefined): WorkspaceCampaign[] {
  if (!data) return [];
  return data.organizations.flatMap((org) =>
    org.campaigns
      .filter((c) => isBackOffice(c.access))
      .map((c) => ({
        ...c,
        organizationName: org.organization.name,
        membershipId: org.membership.id,
      })),
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function readWorkspace(): string | null {
  try {
    return localStorage.getItem(WORKSPACE_KEY);
  } catch {
    return null;
  }
}

function storeWorkspace(id: string) {
  try {
    localStorage.setItem(WORKSPACE_KEY, id);
  } catch {
    /* storage blocked — selection lasts for this tab only */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState(() => readSession() !== null);
  const [campaignId, setCampaignId] = useState<string | null>(readWorkspace);

  const contextQuery = useQuery({
    queryKey: queryKeys.authContext,
    queryFn: async () => (await authApi.context()).data,
    enabled: hasToken,
    staleTime: 5 * 60_000,
  });

  const endLocalSession = useCallback(() => {
    clearSession();
    setHasToken(false);
    queryClient.clear();
  }, [queryClient]);

  // The API client clears the token on a 401; mirror that here.
  useEffect(() => {
    function onUnauthorized() {
      endLocalSession();
      toast.error("Your session has ended. Sign in again.");
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [endLocalSession]);

  // Sign out locally when the token's expiry passes, rather than on the next 401.
  useEffect(() => {
    const expiresAt = hasToken ? readSession()?.expiresAt : null;
    if (!expiresAt) return;
    const ms = Date.parse(expiresAt) - Date.now();
    // setTimeout overflows past ~24.8 days; long-lived tokens rely on the 401 path.
    if (!Number.isFinite(ms) || ms > 2_147_000_000) return;
    const timer = window.setTimeout(() => {
      endLocalSession();
      toast.info("Your session expired. Sign in again.");
    }, Math.max(ms, 0));
    return () => window.clearTimeout(timer);
  }, [hasToken, endLocalSession]);

  const signIn = useCallback(
    async (email: string, password: string, remember: boolean) => {
      const { data } = await authApi.login({ email, password, device_name: DEVICE_NAME });
      saveSession({ token: data.token, expiresAt: data.expires_at }, remember);

      let context: AuthContextData;
      try {
        context = await queryClient.fetchQuery({
          queryKey: queryKeys.authContext,
          queryFn: async () => (await authApi.context()).data,
        });
      } catch (err) {
        clearSession();
        throw err;
      }

      if (workspaceCampaigns(context).length === 0) {
        // Revoke the token we just issued; this account can't use the back office.
        const token = data.token;
        clearSession();
        queryClient.removeQueries({ queryKey: queryKeys.authContext });
        authApi.logout(token).catch(() => undefined);
        const fieldOnly = context.organizations.some((o) =>
          o.campaigns.some((c) => c.access.can_work),
        );
        throw new ApiError({
          status: 403,
          code: "no_back_office_access",
          message: fieldOnly
            ? "This is a field-agent account. Use the Sentinel field app to sign in."
            : "This account has no campaign access in the back office. Contact your administrator.",
        });
      }

      setHasToken(true);
    },
    [queryClient],
  );

  const signOut = useCallback(() => {
    // Revoke in the background: the local session ends immediately either way.
    const token = getToken();
    if (token) authApi.logout(token).catch(() => undefined);
    endLocalSession();
  }, [endLocalSession]);

  const selectCampaign = useCallback((id: string) => {
    storeWorkspace(id);
    setCampaignId(id);
  }, []);

  const value = useMemo<AuthValue>(() => {
    const data = hasToken ? contextQuery.data : undefined;
    const campaigns = workspaceCampaigns(data);
    // A stored selection from another account falls back to the first campaign.
    const activeCampaign = campaigns.find((c) => c.id === campaignId) ?? campaigns[0] ?? null;
    const activeOrganization =
      data?.organizations.find((o) => o.organization.id === activeCampaign?.organization_id) ??
      null;
    const apiUser = data?.user ?? null;

    return {
      user: apiUser
        ? {
            id: apiUser.id,
            name: apiUser.name,
            initials: initialsOf(apiUser.name),
            role: roleLabel(activeCampaign?.access.role ?? activeOrganization?.membership.role),
            email: apiUser.email,
          }
        : null,
      apiUser,
      isAuthenticated: hasToken,
      isReady: hasToken && contextQuery.isSuccess,
      contextError: contextQuery.error,
      organizations: data?.organizations ?? [],
      campaigns,
      activeCampaign,
      activeOrganization,
      access: activeCampaign?.access ?? null,
      selectCampaign,
      signIn,
      signOut,
      refreshContext: () => contextQuery.refetch(),
    };
  }, [hasToken, contextQuery, campaignId, selectCampaign, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** The selected campaign; only call inside routes guarded by ProtectedRoute. */
// eslint-disable-next-line react-refresh/only-export-components
export function useActiveCampaign(): WorkspaceCampaign {
  const { activeCampaign } = useAuth();
  if (!activeCampaign) throw new Error("useActiveCampaign needs a loaded workspace");
  return activeCampaign;
}
