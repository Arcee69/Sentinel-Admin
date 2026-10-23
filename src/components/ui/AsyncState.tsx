import type { ReactNode } from "react";
import { AlertCircle, Loader2, RotateCw } from "lucide-react";
import { errorMessage } from "../../services/errors";
import { cn } from "../../lib/cn";

/** Placeholder bars while a panel's data loads. */
export function LoadingRows({
  rows = 4,
  padded = true,
  className,
}: {
  rows?: number;
  /** Off inside panels whose body already has padding. */
  padded?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("space-y-2.5", padded && "p-4 sm:p-5", className)}
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="h-9 animate-pulse rounded-lg bg-muted/50"
          style={{ opacity: 1 - i * 0.15 }}
        />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function InlineSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" /> {label}
    </span>
  );
}

export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center gap-2 px-4 py-8 text-center", className)}
    >
      <AlertCircle className="h-5 w-5 text-destructive" />
      <p className="max-w-xs text-xs text-muted-foreground">{errorMessage(error)}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          <RotateCw className="h-3 w-3" /> Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  detail,
  className,
}: {
  icon?: ReactNode;
  title: string;
  detail?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-1.5 px-4 py-8 text-center", className)}>
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <p className="text-xs font-medium">{title}</p>
      {detail && <p className="max-w-xs text-[11px] text-muted-foreground">{detail}</p>}
    </div>
  );
}
