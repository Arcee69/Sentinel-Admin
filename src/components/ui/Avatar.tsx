import { cn } from "../../lib/cn";

export function Avatar({
  initials,
  className,
  tone = "primary",
}: {
  initials: string;
  className?: string;
  tone?: "primary" | "accent" | "muted";
}) {
  const tones = {
    primary: "bg-primary/15 text-primary border-primary/25",
    accent: "bg-accent/15 text-accent border-accent/25",
    muted: "bg-muted text-muted-foreground border-border",
  } as const;

  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full border font-semibold",
        "h-9 w-9 text-[11px]",
        tones[tone],
        className,
      )}
    >
      {initials}
    </span>
  );
}
