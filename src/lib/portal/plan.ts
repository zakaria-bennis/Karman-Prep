import type { PlanId } from "@/lib/plans/catalog";
import type { PortalPlan } from "./data";

/** Which of the portal's three menus a plan gets. Free, Practice, Pro, school seats and tutor codes
 *  share the Practice menu; the cohort and the private plans have their own. */
export function portalPlanOf(id: PlanId): PortalPlan {
  if (id === "cohort") return "cohort";
  if (id === "private-10" || id === "private-20") return "private";
  return "practice";
}
