import { Button } from "./Button";
import { cn } from "../../lib/cn";

const fmtNum = (n: number) => n.toLocaleString("en-US");

/** Previous / Next controls for a server-paged list. `page` is zero-based. */
export function Pager({
  page,
  pageCount,
  onPage,
  className,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-t border-border text-xs text-muted-foreground",
        className,
      )}
    >
      <span>
        Page {fmtNum(page + 1)} of {fmtNum(pageCount)}
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page === 0} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page + 1 >= pageCount}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
