// Who may pay for the tutor plan, asked before Stripe opens (start-checkout.ts) and again on the page
// a refused account lands on (/tutors/welcome). The rule itself is mayBuyTutorPlan in rules.ts.

import { getPlan } from "@/lib/plans";
import { mayBuyTutorPlan } from "./rules";

/** The one line a refused account reads. */
export const TUTOR_PLAN_REFUSED =
  "This account is already a student or parent account. Use a separate account for tutoring.";

/** True when this account must not be sent to Stripe for the tutor plan. `role` is its `users.role`,
 *  null when it has no record yet. */
export async function tutorPlanRefused(clerkId: string, role: string | null): Promise<boolean> {
  if (role !== "student") return !mayBuyTutorPlan(role, []);
  return !mayBuyTutorPlan(role, (await getPlan(clerkId)).sources);
}
