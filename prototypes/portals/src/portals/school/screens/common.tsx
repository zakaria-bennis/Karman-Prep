import type { ReactNode } from "react";
import { Panel } from "@/design-system/glass/Panel";
import { Skeleton } from "@/design-system/components/Skeleton";
import { KpiStrip, type KpiItem } from "@/design-system/components/KPI";
import { ErrorBlock } from "@/design-system/components/Empty";
import { Icon } from "@/design-system/icons";
import { cn } from "@/design-system/cn";
import { fmtDate } from "@/mock";
import type { Licence } from "../mock";
import { goScreen } from "../nav";
import { useLayout } from "../shell";

/** "Tuesday, Nov 3" */
export const dayDate = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
/** "Nov 3, 2026" */
export const fullDate = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
export const pct = (part: number, whole: number) =>
  whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%";

export const field =
  "h-11 w-full rounded-control border border-border/70 bg-surface px-3 text-body text-text placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** A panel with its heading, and the block's own loading and error states inside its frame. */
export function Block({
  title,
  children,
  loading,
  error,
  what,
  lastGood = "9:14 am",
  onRetry,
  aside,
  fallback,
  className,
  padded = true,
}: {
  title: string;
  children: ReactNode;
  loading?: boolean;
  error?: boolean;
  what?: string;
  lastGood?: string;
  onRetry?(): void;
  aside?: ReactNode;
  fallback?: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <Panel as="section" className={cn(padded ? "px-4 pb-3 pt-3" : "", className)}>
      <div
        className={cn(
          "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pb-1",
          !padded && "px-4 pt-3"
        )}
      >
        <h2 className="shrink-0 text-section">{title}</h2>
        {aside ? <span className="text-dense text-muted">{aside}</span> : null}
      </div>
      {loading ? (
        <div
          role="status"
          aria-busy="true"
          aria-label={`Loading ${title.toLowerCase()}`}
          className={cn(!padded && "px-4 pb-3")}
        >
          {fallback ?? (
            <>
              <Skeleton.Row sub />
              <Skeleton.Row sub />
              <Skeleton.Row />
            </>
          )}
        </div>
      ) : error ? (
        <ErrorBlock
          what={what ?? title.toLowerCase()}
          lastGood={lastGood}
          onRetry={onRetry}
          className={cn("my-2", !padded && "mx-4")}
        />
      ) : (
        children
      )}
    </Panel>
  );
}

/**
 * The lapsed-licence panel: when the school's year has ended, a block stays
 * readable under one line saying what renewing restores and one link, never
 * a nag. The link goes to the Seats screen, where the one Renew button is,
 * so every locked screen has exactly one upgrade path. Shape after the design
 * system's Locked (Billing Upgrade Prompt, 21st.dev 18228), which reads a
 * person's plan; this one reads the licence.
 */
export function Lapsed({
  ended,
  seats,
  licence,
  children,
  className,
  what = "this",
}: {
  ended: boolean;
  seats: number;
  licence: Licence;
  children: ReactNode;
  className?: string;
  what?: string;
}) {
  if (!ended) return <>{children}</>;
  return (
    <div className={cn("relative overflow-hidden rounded-panel", className)} data-locked="school">
      <div className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-raised px-4 py-2">
        <Icon name="lock" size={20} className="shrink-0 text-muted" />
        <p className="min-w-0 flex-1 text-dense">
          <span className="font-semibold">The licence ended {fmtDate(licence.ends)}.</span>
          <span className="text-muted">
            {" "}
            Renewing {seats} seats keeps {what} going.
          </span>
        </p>
        <button
          type="button"
          onClick={() => goScreen("seats")}
          className="min-h-tap shrink-0 text-dense font-semibold text-accent"
        >
          Renew {seats} seats
        </button>
      </div>
      <div aria-hidden="true" className="pointer-events-none select-none [&_*]:!text-muted">
        {children}
      </div>
    </div>
  );
}

/** Two columns (7 and 5 of 12, one 24px gutter: 640 + 24 + 456 = 1120) from 952px; one below. */
export const COLUMNS_MIN = 952;
export const GRID2_MIN = 820;

export function Columns({
  main,
  side,
  className,
}: {
  main: ReactNode;
  side: ReactNode;
  className?: string;
}) {
  const { width, desktop } = useLayout();
  const two = width >= COLUMNS_MIN;
  return (
    <div
      className={cn(
        "grid",
        two ? "grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-6" : desktop ? "gap-6" : "gap-5",
        className
      )}
    >
      <div className={cn("grid content-start", desktop ? "gap-6" : "gap-5")}>{main}</div>
      <div className={cn("grid content-start", desktop ? "gap-6" : "gap-5")}>{side}</div>
    </div>
  );
}

export function Grid2({ children, className }: { children: ReactNode; className?: string }) {
  const { width, desktop } = useLayout();
  const two = width >= GRID2_MIN;
  return (
    <div
      className={cn(
        "grid items-start",
        two ? "grid-cols-2 gap-6" : desktop ? "gap-6" : "gap-5",
        className
      )}
    >
      {children}
    </div>
  );
}

/** The KPI strip, or its skeleton at the same size while loading, so nothing below moves. */
export function Kpis({
  items,
  loading,
  className,
}: {
  items: KpiItem[];
  loading?: boolean;
  className?: string;
}) {
  if (!loading) return <KpiStrip items={items} className={className} />;
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading this week's figures"
      className={cn(
        "grid grid-cols-2 divide-y divide-line rounded-panel border border-line bg-panel sm:auto-cols-fr sm:grid-flow-col sm:divide-x sm:divide-y-0",
        className
      )}
    >
      {items.map((k) => (
        <div key={k.label} className="px-4 py-3">
          <Skeleton.Kpi label={k.label} lead={k.lead} />
        </div>
      ))}
    </div>
  );
}
