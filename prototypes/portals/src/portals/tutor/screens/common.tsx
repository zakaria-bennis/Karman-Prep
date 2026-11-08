import { useState, type ReactNode } from "react";
import { Panel } from "@/design-system/glass/Panel";
import { Sheet } from "@/design-system/components/Sheet";
import { Skeleton } from "@/design-system/components/Skeleton";
import { ErrorBlock } from "@/design-system/components/Empty";
import { Icon } from "@/design-system/icons";
import { cn } from "@/design-system/cn";
import { BUNDLES, PLANS, upgradeFor, type BundleId, type PlanId } from "@/plans/plans";
import { useLayout } from "../shell";

/** "Tuesday, Nov 3" */
export const dayDate = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
export const shortDay = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

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
 * A plan-locked panel seen by the tutor: the bundle, the plan that adds it
 * with its price from the config, one action that shows what the plan adds,
 * never a nag. Shape after the shared Locked component (21st.dev 18228), which
 * reads the signed-in user's plan; this one takes the student's.
 */
export function PlanGate({
  plan,
  bundle,
  children,
  className,
}: {
  plan: PlanId;
  bundle: BundleId;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (PLANS[plan].bundles.includes(bundle)) return <>{children}</>;
  const next = upgradeFor(plan, bundle);
  const nextPlan = next ? PLANS[next] : null;
  const b = BUNDLES[bundle];
  return (
    <div className={cn("relative overflow-hidden rounded-panel", className)} data-locked={bundle}>
      <div className="flex min-h-12 items-center gap-3 border-b border-line bg-raised px-4 py-2">
        <Icon name="lock" size={20} className="shrink-0 text-muted" />
        <p className="min-w-0 flex-1 text-dense">
          <span className="font-semibold">{b.name}</span>
          <span className="text-muted">
            {nextPlan
              ? ` is in ${nextPlan.name}${nextPlan.priceLabel ? `, ${nextPlan.priceLabel}` : ""}.`
              : ` is not in ${PLANS[plan].name}.`}
          </span>
        </p>
        {nextPlan ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-tap shrink-0 text-dense font-semibold text-accent"
          >
            See {nextPlan.name}
          </button>
        ) : null}
      </div>
      <div aria-hidden="true" className="pointer-events-none select-none [&_*]:!text-muted">
        {children}
      </div>
      {nextPlan ? (
        <Sheet open={open} onClose={() => setOpen(false)} title={nextPlan.name}>
          <p className="text-body">{nextPlan.description}</p>
          <p className="mt-2 text-dense text-muted">
            {nextPlan.priceLabel}. The family upgrades from their own account.
          </p>
          <ul className="mt-4 divide-y divide-line">
            {nextPlan.bundles
              .filter((id) => !PLANS[plan].bundles.includes(id))
              .map((id) => (
                <li key={id} className="py-2">
                  <p className="text-body font-medium">{BUNDLES[id].name}</p>
                  <p className="text-dense text-muted">{BUNDLES[id].description}</p>
                </li>
              ))}
          </ul>
        </Sheet>
      ) : null}
    </div>
  );
}

/**
 * Two columns (7 and 5 of 12, one 24px gutter: 640 + 24 + 456 = 1120) once the
 * host is 952px or wider, so the side column is never under 340px (at 768 it
 * would be 262px and every row would truncate); one column below that.
 */
export const COLUMNS_MIN = 952;
/** Two equal columns from 820px (349px each on a portrait iPad), one below. */
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

/**
 * A 12px grey header naming a list's figure column ("Predicted", "Diagnostic"),
 * right-aligned over the rows' trailing figures (which sit before a 20px
 * chevron and a 12px gap inside the row's 4px padding), so the same column
 * never means two things on two screens.
 */
export function ListHead({ figure, className }: { figure: string; className?: string }) {
  return (
    <p className={cn("flex justify-end pr-9 pt-1 text-small text-muted", className)}>{figure}</p>
  );
}

/** A score as "1,360" (en-US), never a bare 1360 beside a formatted one. */
export const score = (n: number | null | undefined) => (n ? n.toLocaleString("en-US") : "-");

/** "4:55 pm" from a decimal hour plus an offset in minutes. */
export function clock(hour: number, offsetMinutes = 0): string {
  const t = Math.round(hour * 60) + offsetMinutes;
  const hh = Math.floor(t / 60);
  const mm = t % 60;
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${hh >= 12 ? "pm" : "am"}`;
}
