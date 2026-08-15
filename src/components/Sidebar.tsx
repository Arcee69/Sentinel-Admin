import { NavLink } from "react-router-dom";
import { ChevronLeft, ShieldCheck, X } from "lucide-react";
import { NAV_ITEMS } from "../lib/nav";
import { cn } from "../lib/cn";

interface Props {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: Props) {
  return (
    <>
      {/* Mobile scrim */}
      <div
        onClick={onCloseMobile}
        aria-hidden
        className={cn(
          "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar",
          "transition-[width,transform] duration-200 ease-out",
          collapsed ? "w-[72px]" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-primary shadow-glow-primary">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold leading-tight tracking-tight">
                SMHP <span className="text-gradient-primary">Sentinel</span>
              </div>
              <div className="truncate text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                Command Platform
              </div>
            </div>
          )}
          <button
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="ml-auto cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map(({ to, label, suffix, icon: Icon, live }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onCloseMobile}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-0",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
                  )}
                  <Icon
                    className={cn(
                      "h-4.5 w-4.5 shrink-0",
                      isActive ? "text-primary" : "text-current",
                    )}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">
                        {label}
                        {suffix && (
                          <span className="ml-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                            · {suffix}
                          </span>
                        )}
                      </span>
                      {live && (
                        <span className="h-1.5 w-1.5 shrink-0 animate-ticker rounded-full bg-destructive" />
                      )}
                    </>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <button
            onClick={onToggleCollapse}
            className={cn(
              "hidden w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs",
              "text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground lg:flex",
              collapsed && "justify-center px-0",
            )}
          >
            <ChevronLeft
              className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
            />
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>
    </>
  );
}
