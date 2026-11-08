/*
 * The score guarantee as a parent sees it (founder, 2026-11-08): the Cohort, Private 10 and
 * Private 20 carry it. The target is +100 points for a baseline under 1400 and +50 from 1400.
 * Baseline is the first measured score; progress is the latest predicted score.
 *
 * Merge note: the pricing session's GUARANTEE in src/lib/marketing/offer.ts carries the same
 * numbers (pointsBelow 100, pointsFrom 50, splitAt 1400). When it lands, read them from there.
 */
export const GUARANTEE_RULE = { pointsBelow: 100, pointsFrom: 50, splitAt: 1400 } as const;

export interface GuaranteeStatus {
  plan: "Cohort" | "Private";
  baseline: number | null;
  target: number | null;
  /** Points gained so far, never below zero. */
  gained: number;
  /** Points the guarantee asks for (+100 or +50). */
  needed: number | null;
  met: boolean;
}

/** Plan names as stored before and after the pricing session's plan ids land. */
function guaranteedPlan(tier: string | null): GuaranteeStatus["plan"] | null {
  if (!tier) return null;
  if (["group", "small_group", "cohort"].includes(tier)) return "Cohort";
  if (["private", "private-10", "private-20", "elite"].includes(tier)) return "Private";
  return null;
}

export function guaranteeFor(
  tier: string | null,
  history: readonly { score: number }[]
): GuaranteeStatus | null {
  const plan = guaranteedPlan(tier);
  if (!plan) return null;
  const baseline = history[0]?.score ?? null;
  if (baseline === null)
    return { plan, baseline: null, target: null, gained: 0, needed: null, met: false };
  const needed =
    baseline < GUARANTEE_RULE.splitAt ? GUARANTEE_RULE.pointsBelow : GUARANTEE_RULE.pointsFrom;
  const latest = history.at(-1)?.score ?? baseline;
  const gained = Math.max(0, latest - baseline);
  return {
    plan,
    baseline,
    target: Math.min(1600, baseline + needed),
    gained,
    needed,
    met: gained >= needed,
  };
}
