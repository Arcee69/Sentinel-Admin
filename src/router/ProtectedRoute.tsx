import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AlertCircle, Loader2, RotateCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { errorMessage } from "../services/errors";

export default function ProtectedRoute() {
  const { isAuthenticated, isReady, contextError, activeCampaign, refreshContext, signOut } =
    useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (contextError && !isReady) {
    return (
      <FullScreen>
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-sm font-semibold">Couldn't load your workspace</p>
        <p className="max-w-sm text-center text-xs text-muted-foreground">
          {errorMessage(contextError)}
        </p>
        <div className="mt-2 flex gap-2">
          <Button variant="primary" onClick={() => refreshContext()}>
            <RotateCw className="h-4 w-4" /> Retry
          </Button>
          <Button variant="outline" onClick={signOut}>Sign out</Button>
        </div>
      </FullScreen>
    );
  }

  if (!isReady) {
    return (
      <FullScreen>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Loading your workspace…</p>
      </FullScreen>
    );
  }

  // Grants can be withdrawn mid-session; with no campaign left there is nothing to show.
  if (!activeCampaign) {
    return (
      <FullScreen>
        <AlertCircle className="h-6 w-6 text-warning" />
        <p className="text-sm font-semibold">No campaign access</p>
        <p className="max-w-sm text-center text-xs text-muted-foreground">
          Your account isn't assigned to a back-office campaign. Contact your administrator.
        </p>
        <Button variant="outline" className="mt-2" onClick={signOut}>
          Sign out
        </Button>
      </FullScreen>
    );
  }

  return <Outlet />;
}

function FullScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background p-4">
      {children}
    </div>
  );
}
