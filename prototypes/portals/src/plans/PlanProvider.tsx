import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  PLANS,
  has as planHas,
  upgradeFor as planUpgradeFor,
  type BundleId,
  type PlanId,
} from "./plans";

interface PlanContextValue {
  plan: PlanId;
  has(bundle: BundleId): boolean;
  upgradeFor(bundle: BundleId): PlanId | null;
  name: string;
}

const Ctx = createContext<PlanContextValue | null>(null);

/** Every screen reads the plan from here; the gallery picks it from the hash. */
export function PlanProvider({ plan, children }: { plan: PlanId; children: ReactNode }) {
  const value = useMemo<PlanContextValue>(
    () => ({
      plan,
      name: PLANS[plan].name,
      has: (b) => planHas(plan, b),
      upgradeFor: (b) => planUpgradeFor(plan, b),
    }),
    [plan]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlan(): PlanContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlan needs a PlanProvider");
  return v;
}
