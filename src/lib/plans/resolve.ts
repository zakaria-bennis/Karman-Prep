// ============================================================
// Server only: load a user's plan sources (Stripe subscriptions and
// plan grants), resolve the most generous active access, count
// free-plan usage, and create or revoke grants. All database access
// sits behind PlanDataSource, so tests pass a fake.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { SCHOOL_PLAN, TUTOR_AFFILIATE_PLAN, type PlanId } from "@/lib/marketing/offer";
import { createAdminClient } from "@/lib/supabase/server";
import type { PlanAccess, PlanUsage } from "./access";
import {
  GRANT_PLAN_IDS,
  ONE_TIME_PLAN_IDS,
  SUBSCRIPTION_PLAN_IDS,
  compareGenerosity,
  mergeEntitlements,
  type GrantPlanId,
  type PlanEntitlements,
  type SubscriptionPlanId,
} from "./catalog";
import { SAT_DATE_PATTERN, isPurchaseAccessOpen, purchaseAccessEndsAt } from "./purchase-access";

export const GRANT_SOURCES = ["purchase", "school", "tutor-affiliate", "admin"] as const;
export type GrantSource = (typeof GRANT_SOURCES)[number];

/** A `public.subscriptions` row, as the rules need it. */
export interface SubscriptionRecord {
  userId: string;
  /** Raw `plan_id`; anything outside SUBSCRIPTION_PLAN_IDS is ignored. */
  planId: string | null;
  status: string;
  currentPeriodEnd: string | null;
  stripeSubscriptionId: string;
}

/** A `public.plan_grants` row. */
export interface PlanGrant {
  id: string;
  userId: string;
  planId: GrantPlanId;
  source: GrantSource;
  sourceRef: string | null;
  sponsorUserId: string | null;
  startsAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export type GrantTerms = Pick<PlanGrant, "planId" | "sponsorUserId" | "startsAt" | "expiresAt">;
export type NewPlanGrant = GrantTerms & { userId: string; source: GrantSource; sourceRef: string };
export type GrantMatch =
  | { grantId: string }
  | { source: GrantSource; sourceRef: string; userId: string };

/** Everything the rules read or write. `supabasePlanDataSource()` is the real one. */
export interface PlanDataSource {
  /** Every subscription row, any status, for these users. */
  subscriptions(userIds: readonly string[]): Promise<SubscriptionRecord[]>;
  /** The user's unrevoked grants. */
  grants(userId: string): Promise<PlanGrant[]>;
  /** Unrevoked tutor-affiliate grants this tutor pays for. */
  sponsoredGrants(sponsorUserId: string): Promise<PlanGrant[]>;
  /** Insert unless (source, sourceRef, userId) exists; returns the stored row either way. */
  insertGrant(grant: NewPlanGrant): Promise<{ grant: PlanGrant; created: boolean }>;
  /** Clear revoked_at on a grant and give it new terms. */
  restoreGrant(id: string, terms: GrantTerms): Promise<PlanGrant>;
  /** Set revoked_at on the matching unrevoked grants; returns how many. */
  revokeGrants(match: GrantMatch, revokedAt: string): Promise<number>;
  /** Distinct questions the user has answered. */
  answeredQuestionCount(userId: string): Promise<number>;
  /** Full-length tests the user has completed. */
  completedFullLengthTests(userId: string): Promise<number>;
  /** The user's `users.sat_test_date` (YYYY-MM-DD), or null when none is set. */
  satTestDate(userId: string): Promise<string | null>;
}

/** One active source of access. */
export interface PlanSource {
  /** "subscription" for a Stripe plan, otherwise the grant's source. */
  kind: "subscription" | GrantSource;
  planId: PlanId;
  /** `stripe_subscription_id`, or `plan_grants.id`. */
  id: string;
  /** When it stops counting: period end, expiry, or a purchase's SAT day end. Null = open-ended. */
  endsAt: string | null;
  /** The tutor paying for a tutor-affiliate grant. */
  sponsorUserId?: string;
}

export interface ResolvedPlan extends PlanAccess {
  userId: string;
  /** The most generous active plan: the one to call "your plan". */
  planId: PlanId;
  /** Every active plan, most generous first; ["free"] when there is nothing else. */
  planIds: PlanId[];
  /** The union of every active source's access. */
  entitlements: PlanEntitlements;
  /** The active sources, most generous first. */
  sources: PlanSource[];
}

export interface GrantResult {
  grant: PlanGrant;
  /** `existing`: the same grant was already there (a retry). `restored`: it had been revoked. */
  status: "created" | "existing" | "restored";
}

/** A grant the rules refuse: the tutor's subscription is not active, or the roster is full. */
export class PlanGrantError extends Error {}

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

// ---------- Supabase adapter ----------

const PAGE = 1000;
const GRANT_COLUMNS =
  "id, user_id, plan_id, source, source_ref, sponsor_user_id, starts_at, expires_at, revoked_at, created_at";
const grantRowSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  plan_id: z.enum(GRANT_PLAN_IDS),
  source: z.enum(GRANT_SOURCES),
  source_ref: z.string().nullable(),
  sponsor_user_id: z.string().nullable(),
  starts_at: z.string(),
  expires_at: z.string().nullable(),
  revoked_at: z.string().nullable(),
  created_at: z.string(),
});
const toGrant = (row: z.infer<typeof grantRowSchema>): PlanGrant => ({
  id: row.id,
  userId: row.user_id,
  planId: row.plan_id,
  source: row.source,
  sourceRef: row.source_ref,
  sponsorUserId: row.sponsor_user_id,
  startsAt: row.starts_at,
  expiresAt: row.expires_at,
  revokedAt: row.revoked_at,
  createdAt: row.created_at,
});
const subscriptionRowSchema = z.object({
  user_id: z.string(),
  plan_id: z.string().nullable(),
  status: z.string(),
  current_period_end: z.string().nullable(),
  stripe_subscription_id: z.string(),
});
const idRow = z.object({ id: z.string() });
const answerRow = z.object({ question_id: z.string() });
const satDateRow = z.object({ sat_test_date: z.string().regex(SAT_DATE_PATTERN).nullable() });

/**
 * Where answers are recorded: skill practice (catalog_practice_*), the earlier
 * node quizzes (quiz_attempts / question_responses) and the quiz runs
 * (quiz_runs / quiz_run_responses). Among runs only the Daily 10, practice
 * sets and Domain quizzes count: the free full-length test and the diagnostic
 * do not use up the 100 questions.
 */
export const COUNTED_RUN_KINDS = ["daily-ten", "practice-set", "domain-quiz"] as const;
const ANSWER_TABLES: readonly {
  parent: string;
  answers: string;
  key: string;
  kinds?: readonly string[];
}[] = [
  { parent: "catalog_practice_sessions", answers: "catalog_practice_responses", key: "session_id" },
  { parent: "quiz_attempts", answers: "question_responses", key: "attempt_id" },
  { parent: "quiz_runs", answers: "quiz_run_responses", key: "run_id", kinds: COUNTED_RUN_KINDS },
];

type Page = PromiseLike<{ data: unknown; error: unknown }>;
async function readAll<T>(
  schema: z.ZodType<T>,
  page: (from: number, to: number) => Page,
  what: string
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(`${what} could not be loaded`);
    const batch = z.array(schema).parse(data ?? []);
    rows.push(...batch);
    if (batch.length < PAGE) return rows;
  }
}

/** The real data source: the service-role Supabase client (server only). */
export function supabasePlanDataSource(
  db: SupabaseClient = createAdminClient() as unknown as SupabaseClient
): PlanDataSource {
  const grantsWhere = (column: "user_id" | "sponsor_user_id", value: string, what: string) =>
    readAll(
      grantRowSchema,
      (from, to) => {
        const query = db.from("plan_grants").select(GRANT_COLUMNS).eq(column, value);
        return (column === "sponsor_user_id" ? query.eq("source", "tutor-affiliate") : query)
          .is("revoked_at", null)
          .order("id", { ascending: true })
          .range(from, to);
      },
      what
    ).then((rows) => rows.map(toGrant));

  return {
    async subscriptions(userIds) {
      if (!userIds.length) return [];
      const rows = await readAll(
        subscriptionRowSchema,
        (from, to) =>
          db
            .from("subscriptions")
            .select("user_id, plan_id, status, current_period_end, stripe_subscription_id")
            .in("user_id", [...userIds])
            .order("id", { ascending: true })
            .range(from, to),
        "Subscriptions"
      );
      return rows.map((row) => ({
        userId: row.user_id,
        planId: row.plan_id,
        status: row.status,
        currentPeriodEnd: row.current_period_end,
        stripeSubscriptionId: row.stripe_subscription_id,
      }));
    },
    grants: (userId) => grantsWhere("user_id", userId, "Plan grants"),
    sponsoredGrants: (sponsorUserId) =>
      grantsWhere("sponsor_user_id", sponsorUserId, "Sponsored grants"),
    async insertGrant(grant) {
      const inserted = await db
        .from("plan_grants")
        .upsert(
          {
            user_id: grant.userId,
            plan_id: grant.planId,
            source: grant.source,
            source_ref: grant.sourceRef,
            sponsor_user_id: grant.sponsorUserId,
            starts_at: grant.startsAt,
            expires_at: grant.expiresAt,
          },
          { onConflict: "source,source_ref,user_id", ignoreDuplicates: true }
        )
        .select(GRANT_COLUMNS);
      if (inserted.error) throw new Error("Plan grant could not be saved");
      const [row] = z.array(grantRowSchema).parse(inserted.data ?? []);
      if (row) return { grant: toGrant(row), created: true };
      const existing = await db
        .from("plan_grants")
        .select(GRANT_COLUMNS)
        .eq("source", grant.source)
        .eq("source_ref", grant.sourceRef)
        .eq("user_id", grant.userId)
        .maybeSingle();
      if (existing.error || !existing.data) throw new Error("Plan grant could not be loaded");
      return { grant: toGrant(grantRowSchema.parse(existing.data)), created: false };
    },
    async restoreGrant(id, terms) {
      const { data, error } = await db
        .from("plan_grants")
        .update({
          revoked_at: null,
          plan_id: terms.planId,
          sponsor_user_id: terms.sponsorUserId,
          starts_at: terms.startsAt,
          expires_at: terms.expiresAt,
        })
        .eq("id", id)
        .select(GRANT_COLUMNS)
        .single();
      if (error || !data) throw new Error("Plan grant could not be restored");
      return toGrant(grantRowSchema.parse(data));
    },
    async revokeGrants(match, revokedAt) {
      const query = db.from("plan_grants").update({ revoked_at: revokedAt }).is("revoked_at", null);
      const { data, error } = await (
        "grantId" in match
          ? query.eq("id", match.grantId)
          : query
              .eq("source", match.source)
              .eq("source_ref", match.sourceRef)
              .eq("user_id", match.userId)
      ).select("id");
      if (error) throw new Error("Plan grant could not be revoked");
      return (data ?? []).length;
    },
    async answeredQuestionCount(userId) {
      const questionIds = new Set<string>();
      for (const table of ANSWER_TABLES) {
        const parents = await readAll(
          idRow,
          (from, to) => {
            const query = db.from(table.parent).select("id").eq("student_id", userId);
            return (table.kinds ? query.in("kind", [...table.kinds]) : query)
              .order("id", { ascending: true })
              .range(from, to);
          },
          "Answered questions"
        );
        for (let i = 0; i < parents.length; i += 100) {
          const ids = parents.slice(i, i + 100).map((row) => row.id);
          const answers = await readAll(
            answerRow,
            (from, to) =>
              db
                .from(table.answers)
                .select("question_id")
                .in(table.key, ids)
                .order("id", { ascending: true })
                .range(from, to),
            "Answered questions"
          );
          for (const answer of answers) questionIds.add(answer.question_id);
        }
      }
      // The Daily Challenge keeps one answer per subject a day, with no parent row.
      const challenge = await readAll(
        answerRow,
        (from, to) =>
          db
            .from("daily_challenge_answers")
            .select("question_id")
            .eq("student_id", userId)
            .order("day", { ascending: true })
            .range(from, to),
        "Answered questions"
      );
      for (const answer of challenge) questionIds.add(answer.question_id);
      return questionIds.size;
    },
    // A full-length test counts once it is finished (quiz_runs.completed_at).
    async completedFullLengthTests(userId) {
      const { count, error } = await db
        .from("quiz_runs")
        .select("id", { count: "exact", head: true })
        .eq("student_id", userId)
        .eq("kind", "full-test")
        .not("completed_at", "is", null);
      if (error) throw new Error("Full-length tests could not be counted");
      return count ?? 0;
    },
    async satTestDate(userId) {
      const { data, error } = await db
        .from("users")
        .select("sat_test_date")
        .eq("clerk_id", userId)
        .maybeSingle();
      if (error) throw new Error("SAT date could not be loaded");
      return data ? satDateRow.parse(data).sat_test_date : null;
    },
  };
}
