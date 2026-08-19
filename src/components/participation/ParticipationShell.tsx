import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Info, Layers, Lock } from "lucide-react";
import { PageHeader } from "../ui/PageHeader";
import { cn } from "../../lib/cn";
import { useAuth } from "../../context/AuthContext";
import { canWrite, PARTICIPATION_NOTES, PARTICIPATION_TABS } from "../../lib/participation";

/** Geography the section drills through, in order. */
const HIERARCHY = ["State", "LGA", "Ward", "Polling Unit"];

/**
 * Chrome shared by every participation surface: the sub-nav, the geography
 * spine, and the standing provenance disclaimers. The disclaimers are part of
 * the shell rather than the page so no surface can ship without them.
 */
export function ParticipationShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const readOnly = !canWrite(user?.role);

  return (
    <div className="space-y-4">
      <PageHeader title={title} subtitle={subtitle} actions={actions} />

      <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card/80 p-1 shadow-card">
        {PARTICIPATION_TABS.map((tab) => {
          // `/participation` is the index route, so it must match exactly or
          // it would light up on every child surface.
          const active =
            tab.to === "/participation"
              ? pathname === tab.to
              : pathname === tab.to || pathname.startsWith(`${tab.to}/`);

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
              )}
            >
              {tab.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-muted/10 px-3 py-2">
        <Layers className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold text-muted-foreground">Nigeria</span>
        {HIERARCHY.map((level) => (
          <span key={level} className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground/50">→</span>
            <span className="text-[11px] font-semibold text-muted-foreground">{level}</span>
          </span>
        ))}
        <span className="ml-auto text-[11px] text-muted-foreground">
          INEC register baseline · Sentinel observation
        </span>
      </div>

      {readOnly && (
        <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-3 text-[11px] text-muted-foreground">
          <Lock className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            Read-only access. Observers can review every participation record but cannot change
            state.
          </span>
        </p>
      )}

      {children}

      <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-3">
        {Object.values(PARTICIPATION_NOTES).map((note) => (
          <p
            key={note}
            className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground"
          >
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{note}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
