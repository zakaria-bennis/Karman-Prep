// ============================================================
// Server only: load a user's plan sources (Stripe subscriptions and
// plan grants), resolve the most generous active access, count
// free-plan usage, and create or revoke grants. All database access
// sits behind PlanDataSource, so tests pass a fake.
// ============================================================

import { z } from "zod";
import { SCHOOL_PLAN, TUTOR_AFFILIATE_PLAN } from "@/lib/marketing/offer";
import type { PlanUsage } from "./access";
import {
  GRANT_PLAN_IDS,
  ONE_TIME_PLAN_IDS,
  SUBSCRIPTION_PLAN_IDS,
  compareGenerosity,
  mergeEntitlements,
  type SubscriptionPlanId,
} from "./catalog";
import { isPurchaseAccessOpen, purchaseAccessEndsAt } from "./purchase-access";

import { GRANT_SOURCES, PlanGrantError } from "./plan-data";
import type {
  PlanDataSource,
  PlanGrant,
  PlanSource,
  ResolvedPlan,
  SubscriptionRecord,
  GrantResult,
  GrantTerms,
} from "./plan-data";
import { supabasePlanDataSource } from "./supabase-source";

export * from "./plan-data";
export { COUNTED_RUN_KINDS, supabasePlanDataSource } from "./supabase-source";

// ---------- Rules (pure) ----------

const isSubscriptionPlanId = (value: string | null): value is SubscriptionPlanId =>
  (SUBSCRIPTION_PLAN_IDS as readonly (string | null)[]).includes(value);

/** active and trialing count; past_due counts until current_period_end. */
export function isSubscriptionActive(sub: SubscriptionRecord, now: Date): boolean {
  if (sub.status === "active" || sub.status === "trialing") return true;
  return (
    sub.status === "past_due" &&
    sub.currentPeriodEnd !== null &&
    Date.parse(sub.currentPeriodEnd) > now.getTime()
  );
}

/** Started, not expired, not revoked. (Affiliate grants also need an active sponsor.) */
export function isGrantCurrent(grant: PlanGrant, now: Date): boolean {
  const t = now.getTime();
  return (
    grant.revokedAt === null &&
    Date.parse(grant.startsAt) <= t &&
    (grant.expiresAt === null || Date.parse(grant.expiresAt) > t)
  );
}

const hasActiveAffiliate = (subs: readonly SubscriptionRecord[], tutorId: string, now: Date) =>
  subs.some(
    (s) => s.userId === tutorId && s.planId === "tutor-affiliate" && isSubscriptionActive(s, now)
  );

const earlier = (a: string | null, b: string | null) =>
  a === null ? b : b === null || Date.parse(a) <= Date.parse(b) ? a : b;

/**
 * Turn loaded rows into a user's access. `subscriptions` holds the user's own
 * rows plus their affiliate sponsors' rows; the rest are ignored. A purchase
 * grant also counts only until the user's SAT date is over (purchase-access.ts).
 */
export function resolvePlan(input: {
  userId: string;
  subscriptions: readonly SubscriptionRecord[];
  grants: readonly PlanGrant[];
  /** The user's `sat_test_date` (YYYY-MM-DD); null when none is set. */
  satTestDate: string | null;
  now?: Date;
}): ResolvedPlan {
  const { userId, subscriptions, grants, satTestDate } = input;
  const now = input.now ?? new Date();
  const sources: PlanSource[] = [];
  for (const sub of subscriptions) {
    if (sub.userId !== userId || !isSubscriptionActive(sub, now)) continue;
    if (!isSubscriptionPlanId(sub.planId)) {
      console.warn(
        `[plans] active subscription ${sub.stripeSubscriptionId} has unknown plan_id ${sub.planId}; ignored`
      );
      continue;
    }
    const endsAt = sub.currentPeriodEnd;
    sources.push({
      kind: "subscription",
      planId: sub.planId,
      id: sub.stripeSubscriptionId,
      endsAt,
    });
  }
  for (const grant of grants) {
    if (grant.userId !== userId || !isGrantCurrent(grant, now)) continue;
    const sponsor = grant.sponsorUserId;
    if (
      grant.source === "tutor-affiliate" &&
      !(sponsor && hasActiveAffiliate(subscriptions, sponsor, now))
    )
      continue;
    const purchase = grant.source === "purchase";
    if (purchase && !isPurchaseAccessOpen(satTestDate, now)) continue;
    sources.push({
      kind: grant.source,
      planId: grant.planId,
      id: grant.id,
      endsAt: purchase
        ? earlier(grant.expiresAt, purchaseAccessEndsAt(satTestDate))
        : grant.expiresAt,
      ...(sponsor ? { sponsorUserId: sponsor } : {}),
    });
  }
  sources.sort((a, b) => compareGenerosity(a.planId, b.planId));
  const planIds = [...new Set(sources.map((source) => source.planId))];
  return {
    userId,
    planId: planIds[0] ?? "free",
    planIds: planIds.length ? planIds : ["free"],
    entitlements: mergeEntitlements(planIds),
    sources,
  };
}

// ---------- Input validation ----------

const clerkIdSchema = z.string().trim().min(1).max(200);
const refSchema = z.string().trim().min(1).max(500);
const instantSchema = z
  .union([z.date(), z.string().datetime({ offset: true })])
  .transform((value) => new Date(value))
  .refine((date) => !Number.isNaN(date.getTime()), "Invalid date");

export const grantPlanInputSchema = z
  .object({
    userId: clerkIdSchema,
    planId: z.enum(GRANT_PLAN_IDS),
    source: z.enum(GRANT_SOURCES),
    /** Checkout session id, school license id, affiliate redemption id, or an admin note id. */
    sourceRef: refSchema,
    /** Required for tutor-affiliate grants, refused for the others. */
    sponsorUserId: clerkIdSchema.optional(),
    startsAt: instantSchema.optional(),
    expiresAt: instantSchema.optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (
      input.source === "purchase" &&
      !(ONE_TIME_PLAN_IDS as readonly string[]).includes(input.planId)
    )
      issue("planId", `A purchase grant is for a one-time plan: ${ONE_TIME_PLAN_IDS.join(", ")}.`);
    if (input.source === "school" && input.planId !== SCHOOL_PLAN.studentPlan)
      issue("planId", `A school seat is the ${SCHOOL_PLAN.studentPlan} plan.`);
    if (input.source === "tutor-affiliate") {
      if (input.planId !== TUTOR_AFFILIATE_PLAN.studentPlan)
        issue("planId", `A tutor-affiliate seat is the ${TUTOR_AFFILIATE_PLAN.studentPlan} plan.`);
      if (!input.sponsorUserId) issue("sponsorUserId", "A tutor-affiliate grant names its tutor.");
      else if (input.sponsorUserId === input.userId)
        issue("sponsorUserId", "A tutor cannot sponsor their own account.");
    } else if (input.sponsorUserId !== undefined) {
      issue("sponsorUserId", "Only tutor-affiliate grants have a sponsor.");
    }
    if (input.startsAt && input.expiresAt && input.expiresAt <= input.startsAt)
      issue("expiresAt", "A grant must expire after it starts.");
  });
export type GrantPlanInput = z.input<typeof grantPlanInputSchema>;

export const purchaseGrantInputSchema = z
  .object({
    userId: clerkIdSchema,
    planId: z.enum(ONE_TIME_PLAN_IDS),
    checkoutSessionId: refSchema,
    /** When the payment happened (Stripe's `created`); defaults to now. */
    purchasedAt: instantSchema.optional(),
  })
  .strict();
export type PurchaseGrantInput = z.input<typeof purchaseGrantInputSchema>;

export const revokeGrantInputSchema = z.union([
  z.object({ grantId: z.string().uuid() }).strict(),
  z.object({ source: z.enum(GRANT_SOURCES), sourceRef: refSchema, userId: clerkIdSchema }).strict(),
]);
export type RevokeGrantInput = z.input<typeof revokeGrantInputSchema>;

// ---------- Public API ----------

/** The user's access: the most generous of every active subscription and grant. */
export async function getPlan(
  userId: string,
  source: PlanDataSource = supabasePlanDataSource(),
  now: Date = new Date()
): Promise<ResolvedPlan> {
  const id = clerkIdSchema.parse(userId);
  const [own, grants] = await Promise.all([source.subscriptions([id]), source.grants(id)]);
  const current = grants.filter((grant) => isGrantCurrent(grant, now));
  const sponsorIds = new Set<string>();
  for (const grant of current) {
    if (grant.source === "tutor-affiliate" && grant.sponsorUserId)
      sponsorIds.add(grant.sponsorUserId);
  }
  // The SAT date only matters to a purchase, so skip the lookup without one.
  const [sponsors, satTestDate] = await Promise.all([
    sponsorIds.size ? source.subscriptions([...sponsorIds]) : [],
    current.some((grant) => grant.source === "purchase") ? source.satTestDate(id) : null,
  ]);
  return resolvePlan({
    userId: id,
    subscriptions: [...own, ...sponsors],
    grants,
    satTestDate,
    now,
  });
}

/** Free-plan usage. Only needed when the plan has a limit (`questionLimit` or `fullLengthTestLimit`). */
export async function getUsage(
  userId: string,
  source: PlanDataSource = supabasePlanDataSource()
): Promise<PlanUsage> {
  const id = clerkIdSchema.parse(userId);
  const [questionsAnswered, fullLengthTestsCompleted] = await Promise.all([
    source.answeredQuestionCount(id),
    source.completedFullLengthTests(id),
  ]);
  return { questionsAnswered, fullLengthTestsCompleted };
}

async function roster(tutorUserId: string, source: PlanDataSource, now: Date) {
  const tutor = clerkIdSchema.parse(tutorUserId);
  const [subs, grants] = await Promise.all([
    source.subscriptions([tutor]),
    source.sponsoredGrants(tutor),
  ]);
  const students = new Set(
    grants
      .filter(
        (g) => g.source === "tutor-affiliate" && g.sponsorUserId === tutor && isGrantCurrent(g, now)
      )
      .map((g) => g.userId)
  );
  return { active: hasActiveAffiliate(subs, tutor, now), students };
}

/**
 * Give a user a plan. Idempotent on (source, sourceRef, userId): a retry returns
 * the stored grant. Granting a revoked school, tutor-affiliate or admin grant
 * again restores it; a revoked purchase (a refund) stays revoked.
 * Tutor-affiliate grants need the tutor's active subscription and a free seat.
 */
export async function grantPlan(
  input: GrantPlanInput,
  source: PlanDataSource = supabasePlanDataSource(),
  now: Date = new Date()
): Promise<GrantResult> {
  const g = grantPlanInputSchema.parse(input);
  if (g.source === "tutor-affiliate" && g.sponsorUserId) {
    const { active, students } = await roster(g.sponsorUserId, source, now);
    if (!active) throw new PlanGrantError("The tutor's affiliate subscription is not active.");
    if (!students.has(g.userId) && students.size >= TUTOR_AFFILIATE_PLAN.maxStudents)
      throw new PlanGrantError(
        `The tutor already sponsors ${TUTOR_AFFILIATE_PLAN.maxStudents} students.`
      );
  }
  const terms: GrantTerms = {
    planId: g.planId,
    sponsorUserId: g.sponsorUserId ?? null,
    startsAt: (g.startsAt ?? now).toISOString(),
    expiresAt: g.expiresAt?.toISOString() ?? null,
  };
  const stored = await source.insertGrant({
    ...terms,
    userId: g.userId,
    source: g.source,
    sourceRef: g.sourceRef,
  });
  if (stored.created) return { grant: stored.grant, status: "created" };
  if (stored.grant.revokedAt === null || stored.grant.source === "purchase")
    return { grant: stored.grant, status: "existing" };
  return { grant: await source.restoreGrant(stored.grant.id, terms), status: "restored" };
}

/**
 * The Stripe webhook's call after a one-time payment (cohort, private-10,
 * private-20). Idempotent on the checkout session id. The grant has no
 * expiry: `getPlan` keeps it open until the student's SAT date is over.
 */
export async function recordPurchaseGrant(
  input: PurchaseGrantInput,
  source: PlanDataSource = supabasePlanDataSource(),
  now: Date = new Date()
): Promise<GrantResult> {
  const p = purchaseGrantInputSchema.parse(input);
  return grantPlan(
    {
      userId: p.userId,
      planId: p.planId,
      source: "purchase",
      sourceRef: p.checkoutSessionId,
      startsAt: p.purchasedAt ?? now,
    },
    source,
    now
  );
}

/** Withdraw a grant by id, or by (source, sourceRef, userId). Returns how many were revoked. */
export async function revokeGrant(
  input: RevokeGrantInput,
  source: PlanDataSource = supabasePlanDataSource(),
  now: Date = new Date()
): Promise<number> {
  return source.revokeGrants(revokeGrantInputSchema.parse(input), now.toISOString());
}

/** Clerk ids of the students who currently hold a seat on this tutor's code. */
export async function sponsoredStudentIds(
  tutorUserId: string,
  source: PlanDataSource = supabasePlanDataSource(),
  now: Date = new Date()
): Promise<string[]> {
  return [...(await roster(tutorUserId, source, now)).students];
}

/** Seats in use on this tutor's code (distinct students with a current grant). */
export async function activeSponsoredCount(
  tutorUserId: string,
  source: PlanDataSource = supabasePlanDataSource(),
  now: Date = new Date()
): Promise<number> {
  return (await roster(tutorUserId, source, now)).students.size;
}

/** True when the tutor's subscription is active and a seat is free (cap: 50). */
export async function canSponsorMore(
  tutorUserId: string,
  source: PlanDataSource = supabasePlanDataSource(),
  now: Date = new Date()
): Promise<boolean> {
  const { active, students } = await roster(tutorUserId, source, now);
  return active && students.size < TUTOR_AFFILIATE_PLAN.maxStudents;
}

/** Tutor-admin rights over one student: an active subscription and the student on the roster. */
export async function canManageStudent(
  tutorUserId: string,
  studentUserId: string,
  source: PlanDataSource = supabasePlanDataSource(),
  now: Date = new Date()
): Promise<boolean> {
  const student = clerkIdSchema.parse(studentUserId);
  const { active, students } = await roster(tutorUserId, source, now);
  return active && students.has(student);
}
