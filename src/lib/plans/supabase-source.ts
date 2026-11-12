// Server only: the real PlanDataSource, backed by the service-role Supabase client.

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { GRANT_PLAN_IDS } from "./catalog";
import { GRANT_SOURCES, type PlanDataSource, type PlanGrant } from "./plan-data";
import { SAT_DATE_PATTERN } from "./purchase-access";

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
