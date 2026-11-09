import type { ReactNode } from "react";
import { cn } from "../cn";

/*
 * Empty: an empty section keeps its frame and its header and adds one
 * sentence spanning the block, with one action. Slots follow Empty (21st.dev
 * 19749, cnippet: header, title, description, content); the stacked icon tile
 * was dropped, since an empty state is words, not a picture.
 */
export function Empty({
  title,
  detail,
  action,
  className,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-h-[96px] content-center gap-1 rounded-card border border-dashed border-border/60 px-4 py-5",
        className
      )}
    >
      <p className="text-body font-semibold">{title}</p>
      {detail ? <p className="text-dense text-muted">{detail}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Error inside the block that failed: what failed, when the data was last good, and Retry. */
export function ErrorBlock({
  what,
  lastGood,
  onRetry,
  className,
}: {
  what: string;
  lastGood?: string;
  onRetry?(): void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-card bg-raised px-4 py-3",
        className
      )}
      role="alert"
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-negative" aria-hidden="true" />
      <p className="text-dense">
        Couldn&rsquo;t load {what}.
        {lastGood ? <span className="text-muted"> Last updated {lastGood}.</span> : null}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-tap min-w-tap px-1 text-dense font-semibold text-accent"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
