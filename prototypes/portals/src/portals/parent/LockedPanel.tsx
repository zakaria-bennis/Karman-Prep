import type { ReactNode } from "react";
import { cn } from "@/design-system/cn";
import { Icon } from "@/design-system/icons";
import { BUNDLES, PLANS, type BundleId } from "@/plans/plans";
import { usePlan } from "@/plans/PlanProvider";
import { useDesktop } from "./view";

/*
 * LockedPanel: the design system's Locked (Billing Upgrade Prompt, 21st.dev
 * 18228) with two fixes, for promotion into Locked.tsx:
 *  - the hidden content is `inert` as well as aria-hidden, so its controls
 *    leave the tab order (a hidden toggle was still keyboard-operable);
 *  - on a phone the lock line and its one action wrap onto two lines, so the
 *    sentence never squeezes to one word a line beside the link.
 * One line says what the upgrade adds, one action offers it, never a nag.
 */
export function LockedPanel({
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
  const desktop = useDesktop();
  if (has(bundle)) return <>{children}</>;
  const next = upgradeFor(bundle);
  const nextPlan = next ? PLANS[next] : null;
  const b = BUNDLES[bundle];
  return (
    <div className={cn("relative overflow-hidden rounded-panel", className)} data-locked={bundle}>
      <div className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-raised px-4 py-2">
        <div className={cn("flex min-w-0 flex-1 items-center gap-3", !desktop && "basis-full")}>
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
        </div>
        {nextPlan ? (
          <button
            type="button"
            onClick={() => onUpgrade?.(nextPlan.id)}
            className="ml-auto min-h-tap shrink-0 text-dense font-semibold text-accent"
          >
            See {nextPlan.name}
          </button>
        ) : null}
      </div>
      <div aria-hidden="true" inert className="pointer-events-none select-none [&_*]:!text-muted">
        {children}
      </div>
    </div>
  );
}
