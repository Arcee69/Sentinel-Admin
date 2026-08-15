export type ClassValue = string | false | null | undefined;

/** Tiny class joiner — no runtime dep needed for this app's needs. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
