import { createContext, useContext, useState, type ReactNode } from "react";
import { Sheet } from "@/design-system/components/Sheet";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Locked } from "@/design-system/components/Locked";
import { useToast } from "@/design-system/components/Toast";
import { usePlan } from "@/plans/PlanProvider";
import { BUNDLES, LADDER, PLANS, type BundleId, type PlanId } from "@/plans/plans";
import { cn } from "@/design-system/cn";

/*
 * The upgrade sheet: the plan ladder as a list of rows, the plan that adds the
 * locked bundle highlighted, one action. Ported from Pricing Tiers List
 * (21st.dev 28540, felipemenezes098: the Item rows with a title, a price in
 * grey and a description) with its Popular badge and per-row buttons left out,
 * and the one-line-and-one-action shape of Billing Upgrade Prompt (21st.dev
 * 18228). Prices come from the plan config, never from a component.
 */
interface Ctx {
  open(target: PlanId, bundle?: BundleId): void;
}
const PlanSheetCtx = createContext<Ctx>({ open: () => {} });

export function usePlanSheet() {
  return useContext(PlanSheetCtx);
}

export function PlanSheetProvider({ children }: { children: ReactNode }) {
  const { plan } = usePlan();
  const toast = useToast();
  const [state, setState] = useState<{ target: PlanId; bundle?: BundleId } | null>(null);
  const target = state ? PLANS[state.target] : null;
  const mine = LADDER.indexOf(plan);
  return (
    <PlanSheetCtx.Provider value={{ open: (t, bundle) => setState({ target: t, bundle }) }}>
      {children}
      <Sheet open={state !== null} onClose={() => setState(null)} title="Plans">
        {state?.bundle ? (
          <p className="pb-3 text-body text-muted">
            {BUNDLES[state.bundle].name}: {BUNDLES[state.bundle].description}
          </p>
        ) : null}
        <ol className="grid gap-2" role="list">
          {LADDER.map((id, i) => {
            const p = PLANS[id];
            const current = id === plan;
            const chosen = id === state?.target;
            const adds = state?.bundle && p.bundles.includes(state.bundle) && !current && i > mine;
            return (
              <li
                key={id}
                aria-current={chosen ? "true" : undefined}
                className={cn(
                  "rounded-card border px-4 py-3",
                  chosen ? "border-accent bg-accent/10" : "border-line"
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-body font-semibold">
                    {p.name}
                    {current ? (
                      <span className="ml-2 text-dense font-normal text-muted">Your plan</span>
                    ) : null}
                  </span>
                  <span className="tabular shrink-0 text-dense text-muted">
                    {p.priceLabel || "Free"}
                  </span>
                </div>
                <p className="mt-0.5 text-dense text-muted">{p.description}</p>
                {adds ? (
                  <p className="mt-1 text-dense text-positive">Adds what you opened this for.</p>
                ) : null}
              </li>
            );
          })}
        </ol>
        {target && target.id !== plan ? (
          <div className="pt-5">
            <GlassButton
              variant="primary"
              onClick={() => {
                setState(null);
                toast.push({
                  title: `Switching to ${target.name}`,
                  detail: "In the app this opens checkout. Nothing is charged in the prototype.",
                  kind: "status",
                });
              }}
            >
              Switch to {target.name}
              {target.priceLabel ? `, ${target.priceLabel}` : ""}
            </GlassButton>
          </div>
        ) : null}
      </Sheet>
    </PlanSheetCtx.Provider>
  );
}

/** A locked block with the sheet wired as its one upgrade action. */
export function PlanLocked({
  bundle,
  children,
  className,
}: {
  bundle: BundleId;
  children: ReactNode;
  className?: string;
}) {
  const { open } = usePlanSheet();
  return (
    <Locked bundle={bundle} className={className} onUpgrade={(p) => open(p as PlanId, bundle)}>
      {children}
    </Locked>
  );
}
