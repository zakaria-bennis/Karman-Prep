import type { ReactNode } from "react";
import { Icon } from "@/design-system/icons";
import { BUNDLES, PLANS, type BundleId } from "@/plans/plans";
import { usePlan } from "@/plans/PlanProvider";

/*
 * A plan-locked frame that stays readable: the design system's Locked shape
 * (one line says what the upgrade adds, one action offers it, never a nag;
 * Billing Upgrade Prompt, 21st.dev 18228, for the shape), with one change for
 * promotion: the content is drained of colour (grayscale, which keeps every
 * pair's luminance and so its contrast) instead of recoloured, so text that
 * sits on an accent fill (the primary button, the right-answer dots) keeps its
 * own ink. Opacity was measured and rejected: at 72 percent muted text falls
 * to 3.2:1 in Ivory. Candidate to replace Locked's `[&_*]:!text-muted`.
 */
export function LockedFrame({
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
    <div
      className={`relative overflow-hidden rounded-panel ${className ?? ""}`}
      data-locked={bundle}
    >
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
      <div
        aria-hidden="true"
        className="pointer-events-none select-none"
        style={{ filter: "grayscale(1)" }}
      >
        {children}
      </div>
    </div>
  );
}
