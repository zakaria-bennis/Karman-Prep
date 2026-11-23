// The testing switch (founder, 2026-11-23): while karmanprep.com is behind the site password, everyone
// who gets in is a tester, and may move freely between the five plans. The plan they pick is saved
// with their account (`public.tester_plans`) and `getPlan` gives them exactly that plan, so every
// rule that reads the plan (question limits, locks, the menus, Cohort chat, the Private calendar)
// follows it on the server.
//
// The switch is on only while the Worker has a `SITE_PASSWORD` secret, the same secret that turns
// the site lock on (src/lib/site-lock/lock.ts). At launch the secret goes, the saved choices stop
// counting, and the switch leaves the page without a code change. Nothing here touches Stripe.
// Pure rules, safe anywhere; the database calls go through PlanDataSource.

import { z } from "zod";
import type { PlanId } from "./catalog";
import { mergeEntitlements } from "./catalog";
import type { ResolvedPlan } from "./plan-data";

/** The plans a tester can pick, in the order the switch shows them. "Private" is Private 10. */
export const TESTER_PLAN_IDS = [
  "free",
  "practice",
  "pro",
  "cohort",
  "private-10",
] as const satisfies readonly PlanId[];
export type TesterPlanId = (typeof TESTER_PLAN_IDS)[number];

export const isTesterPlanId = (value: unknown): value is TesterPlanId =>
  typeof value === "string" && (TESTER_PLAN_IDS as readonly string[]).includes(value);

/** What the switch's action accepts: one of the five plans, nothing else. */
export const testerPlanInputSchema = z.object({ planId: z.enum(TESTER_PLAN_IDS) }).strict();
export type TesterPlanInput = z.input<typeof testerPlanInputSchema>;

type Env = Readonly<Record<string, string | undefined>>;

/** True while the site lock is on: the Worker has a non-empty `SITE_PASSWORD`. */
export function testerSwitchOn(env: Env = process.env): boolean {
  return (env.SITE_PASSWORD ?? "").length > 0;
}

/** A tester's access: exactly the plan they picked, whatever else they hold. */
export function testerResolvedPlan(userId: string, planId: TesterPlanId): ResolvedPlan {
  return {
    userId,
    planId,
    planIds: [planId],
    entitlements: mergeEntitlements([planId]),
    sources: [{ kind: "tester", planId, id: `tester:${userId}`, endsAt: null }],
  };
}

/** True when the plan comes from the testing switch, not from a payment, a school or a tutor. */
export const isTesterPlan = (plan: Pick<ResolvedPlan, "sources">): boolean =>
  plan.sources.some((source) => source.kind === "tester");
