import type { ReactNode } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { cn } from "@/design-system/cn";
import type { Bundle, Plan } from "@/plans/plans";

/*
 * PlanLadder: the plan the family is on and the next one up, as rows of the
 * name, the price and what the next plan adds, with one action. Ported from
 * Pricing Tiers List (21st.dev 28540, felipemenezes098: Item, ItemContent,
 * ItemTitle, ItemDescription, ItemActions in an outlined ItemGroup); the
 * Popular badge, the avatar and the dropdown were left out, and every name
 * and price comes from the plan config. Nothing here nags: one line, one action.
 * Below the desktop breakpoint the action drops under the text, full width,
 * so the next plan's name never squeezes to one word a line beside it.
 */
export function PlanLadder({
  current,
  next,
  onUpgrade,
  desktop,
  children,
  className,
}: {
  current: Plan;
  next: { plan: Plan; adds: Bundle[] } | null;
  onUpgrade(): void;
  /** Measured on the frame: true keeps the action beside the text. */
  desktop: boolean;
  /** What the current plan includes, listed under its row. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div role="list" className={className}>
      <div role="listitem" className="flex flex-wrap items-start gap-x-4 gap-y-2 py-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-body font-semibold">
            {current.name}
            {current.priceLabel ? (
              <span className="font-normal text-muted">{current.priceLabel}</span>
            ) : null}
          </p>
          <p className="mt-0.5 text-dense text-muted">{current.description}</p>
          {children}
        </div>
      </div>
      {next ? (
        <div
          role="listitem"
          className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line py-3"
        >
          <div className={cn("min-w-0 flex-1", !desktop && "basis-full")}>
            <p className="flex flex-wrap items-center gap-2 text-body font-semibold">
              {next.plan.name}
              <span className="font-normal text-muted">{next.plan.priceLabel}</span>
            </p>
            <p className="mt-0.5 text-dense text-muted">
              Adds {next.adds.map((b) => b.name.toLowerCase()).join(", ")}.
              {next.plan.billing === "month" ? " Monthly, cancel any time." : ""}
            </p>
          </div>
          <GlassButton
            variant="primary"
            onClick={onUpgrade}
            className={desktop ? undefined : "w-full"}
          >
            See {next.plan.name}
          </GlassButton>
        </div>
      ) : (
        <p className="border-t border-line py-3 text-dense text-muted">
          Nothing above this plan. It carries everything Karman offers.
        </p>
      )}
    </div>
  );
}
