/*
 * The score guarantee as a parent sees it: the Cohort, Private 10 and Private 20 carry it. The target
 * depends on the starting score and on the plan (offer.ts, GUARANTEE; founder, 2026-11-09), and from a
 * start of 1460 there is none. Baseline is the first measured score; progress is the latest predicted
 * score.
 */
import { GUARANTEE, guaranteedGain, type GuaranteeTrack } from "@/lib/marketing/offer";

export interface GuaranteeStatus {
  plan: "Cohort" | "Private";
  baseline: number | null;
  target: number | null;
  /** Points gained so far, never below zero. */
  gained: number;
  /** Points the guarantee asks for; null before a first score, and when the start is too high. */
  needed: number | null;
  /** True when the starting score is at or above the point where no guarantee is sold. */
  none: boolean;
  met: boolean;
}

/** Private 10 carries the cohort's numbers; every other private plan carries the full ones. */
function trackOf(tier: string | null, plan: GuaranteeStatus["plan"]): GuaranteeTrack {
  return plan === "Cohort" || tier === "private-10" ? "cohort" : "private";
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
    return { plan, baseline: null, target: null, gained: 0, needed: null, none: false, met: false };
  const latest = history.at(-1)?.score ?? baseline;
  const gained = Math.max(0, latest - baseline);
  const needed = guaranteedGain(baseline, trackOf(tier, plan));
  if (needed === null)
    return { plan, baseline, target: null, gained, needed: null, none: true, met: false };
  return {
    plan,
    baseline,
    target: Math.min(GUARANTEE.topScore, baseline + needed),
    gained,
    needed,
    none: false,
    met: gained >= needed,
  };
}
