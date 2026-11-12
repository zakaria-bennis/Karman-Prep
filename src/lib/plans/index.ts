/**
 * Plan access rules, enforced on the server. See README.md in this folder.
 *
 * ```ts
 * const plan = await getPlan(userId);
 * if (!canAccess(plan, "pool:mastery")) notFound();
 * ```
 *
 * This entry point reaches the database (`getPlan`, `getUsage`, the grant
 * helpers), so import it from server code only. The pure rules live in
 * `./access` and `./catalog` and are safe anywhere.
 *
 * @module
 */

/** What each plan opens, built from `src/lib/marketing/offer.ts`. */
export {
  PLAN_ENTITLEMENTS,
  SUBSCRIPTION_PLAN_IDS,
  ONE_TIME_PLAN_IDS,
  GRANT_PLAN_IDS,
  CORE_MAX_DIFFICULTY,
  isPlanId,
  planRank,
  mostGenerous,
  mergeEntitlements,
  type PlanId,
  type PlanEntitlements,
  type QuestionPool,
  type ExplanationType,
  type SubscriptionPlanId,
  type OneTimePlanId,
  type GrantPlanId,
} from "./catalog";

/** Pure checks: pools, explanations, the free limits, tutor rights. */
export {
  FEATURES,
  canAccess,
  canSeeQuestion,
  isCoreFallback,
  difficultyRangeForSkill,
  poolFor,
  difficultyLevel,
  difficultyRangeFor,
  explanationTypes,
  questionsLeft,
  type Feature,
  type PlanAccess,
  type PlanUsage,
} from "./access";

/** Database side: resolve a user's plan, count usage, create and revoke grants. */
export {
  getPlan,
  getUsage,
  grantPlan,
  recordPurchaseGrant,
  revokeGrant,
  sponsoredStudentIds,
  activeSponsoredCount,
  canSponsorMore,
  canManageStudent,
  resolvePlan,
  COUNTED_RUN_KINDS,
  supabasePlanDataSource,
  PlanGrantError,
  GRANT_SOURCES,
  type ResolvedPlan,
  type PlanSource,
  type PlanGrant,
  type GrantResult,
  type GrantSource,
  type GrantPlanInput,
  type PurchaseGrantInput,
  type RevokeGrantInput,
  type PlanDataSource,
  type SubscriptionRecord,
} from "./resolve";
