import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "../lib/cn";

export interface FilterOption {
  value: string;
  label: string;
  /** Secondary line under the label. */
  hint?: string;
}

interface Props {
  /** Small muted caption on the button, e.g. "Campaign". */
  caption: string;
  value: string;
  valueLabel: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  /** Show a filter box once the list gets long. */
  searchable?: boolean;
  align?: "left" | "right";
}

/** Dropdown used by the topbar campaign and scope pickers. */
export function FilterMenu({
  caption,
  value,
  valueLabel,
  options,
  onChange,
  searchable = false,
  align = "left",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    if (searchable) searchRef.current?.focus();

    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, searchable]);

  const visible = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          setQuery("");
        }}
        className={cn(
          "flex max-w-44 cursor-pointer items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm transition-colors xl:max-w-80",
          open ? "border-primary/50" : "border-border hover:border-primary/50",
        )}
      >
        <span className="hidden text-xs text-muted-foreground lg:inline">{caption}</span>
        <span className="truncate font-medium">{valueLabel}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-50 mt-2 w-64 animate-rise-in overflow-hidden rounded-xl border border-border bg-popover shadow-elevated",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <p className="border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {caption}
          </p>

          {searchable && (
            <div className="relative border-b border-border p-2">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter states…"
                className="h-8 w-full rounded-md border border-border bg-input/60 pl-8 pr-2 text-xs placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
              />
            </div>
          )}

          <ul className="max-h-72 overflow-y-auto py-1">
            {visible.map((o) => {
              const active = o.value === value;
              return (
                <li key={o.value}>
                  <button
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors",
                      active ? "bg-primary/10" : "hover:bg-secondary/60",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-[13px]",
                          active ? "font-semibold text-primary" : "font-medium",
                        )}
                      >
                        {o.label}
                      </span>
                      {o.hint && (
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {o.hint}
                        </span>
                      )}
                    </span>
                    {active && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  </button>
                </li>
              );
            })}

            {visible.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                No match for “{query}”.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
