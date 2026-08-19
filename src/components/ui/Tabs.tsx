import { useRef, type ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface TabDef<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  tabs: readonly TabDef<T>[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}

/** Roving-focus tab list. Panels are rendered by the caller. */
export function TabsList<T extends string>({ tabs, value, onChange, className }: Props<T>) {
  const ref = useRef<HTMLDivElement>(null);

  function onKeyDown(e: React.KeyboardEvent) {
    const i = tabs.findIndex((t) => t.value === value);
    let next: number;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;

    e.preventDefault();
    onChange(tabs[next].value);
    ref.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  }

  return (
    <div
      ref={ref}
      role="tablist"
      onKeyDown={onKeyDown}
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/40 p-1",
        className,
      )}
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            id={`tab-${t.value}`}
            aria-selected={active}
            aria-controls={`panel-${t.value}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.value)}
            className={cn(
              "cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active
                ? "bg-primary/15 text-primary shadow-sm ring-1 ring-primary/25"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  value,
  active,
  children,
}: {
  value: string;
  active: boolean;
  children: ReactNode;
}) {
  if (!active) return null;
  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      className="mt-4"
    >
      {children}
    </div>
  );
}
