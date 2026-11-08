import type { ReactNode } from "react";
import { cn } from "../cn";
import { Icon } from "../icons";
import { BUNDLES, PLANS, type BundleId } from "@/plans/plans";
import { usePlan } from "@/plans/PlanProvider";

/*
 * Locked: a plan-locked panel that stays readable. One line says what the
 * upgrade adds, one action offers it, and it never nags. Billing Upgrade
 * Prompt (21st.dev 18228) was the reference for the one-line-and-one-action
 * shape; its banner, badge and savings pill were left out.
 */
export function Locked({
  bundle,
  children,
  className,
  onUpgrade,
}: {
  bundle: BundleId;
  children: ReactNode;
  className?: string;
  onUpgrade?(plan: string): void;
}) {
  const { plan, has, upgradeFor } = usePlan();
  if (has(bundle)) return <>{children}</>;
  const next = upgradeFor(bundle);
  const nextPlan = next ? PLANS[next] : null;
  const b = BUNDLES[bundle];
  return (
    <div className={cn("relative overflow-hidden rounded-panel", className)} data-locked={bundle}>
      <div className="flex min-h-12 items-center gap-3 border-b border-line bg-raised px-4 py-2">
        <Icon name="lock" size={20} className="shrink-0 text-muted" />
        <p className="min-w-0 flex-1 text-dense">
          <span className="font-semibold">{b.name}</span>
          {nextPlan ? (
            <span className="text-muted">
              {" "}
              is in {nextPlan.name}
              {nextPlan.priceLabel ? `, ${nextPlan.priceLabel}` : ""}.
            </span>
          ) : (
            <span className="text-muted"> is not in the {PLANS[plan].name} plan.</span>
          )}
        </p>
        {nextPlan ? (
          <button
            type="button"
            onClick={() => onUpgrade?.(nextPlan.id)}
            className="min-h-tap shrink-0 text-dense font-semibold text-accent"
          >
            See {nextPlan.name}
          </button>
        ) : null}
      </div>
      <div aria-hidden="true" className="pointer-events-none select-none [&_*]:!text-muted">
        {children}
      </div>
    </div>
  );
}
