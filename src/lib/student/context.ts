/*
 * Who the signed-in student is, for every page of the student portal: their account, plan,
 * test and date, streak and open homework. One place, so each page stays small.
 *
 * Plan: no live subscription means the Free plan, which gets the portal with honest locks
 * (founder ladder, 2026-11-08). Admins previewing a student see that student's portal.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { countOpenHomework } from "./homework";
import { getPlan } from "@/lib/plans";
import { showsCalendar, studentPlan, type StudentPlan } from "./plan-gate";
import { dayKey, streaks } from "./streak";

export type TestType = "sat" | "psat";

export interface StudentContext {
  clerkId: string;
  isImpersonating: boolean;
  /** users.id (uuid). */
  userId: string;
  firstName: string | null;
  email: string | null;
  /** ISO date of the student's SAT or PSAT, if set. */
  testDate: string | null;
  testType: TestType | null;
  plan: StudentPlan;
  subscription: Record<string, unknown> | null;
  streak: { current: number; longest: number };
  /** Days the student practiced (YYYY-MM-DD, Central time), for Progress. */
  practiceDays: string[];
  /** Open tutor homework, for the tab badge. */
  homeworkOpen: number;
  /** A tutor or cohort can assign this student work. */
  hasTutor: boolean;
  showCalendar: boolean;
}

/** Untyped: the generated types predate the catalog practice tables. */
type Db = SupabaseClient;

/** Days with practice: point awards (right answers) and saved practice answers. */
async function practiceDaysFor(db: Db, clerkId: string): Promise<string[]> {
  const since = new Date(Date.now() - 400 * 86_400_000).toISOString();
  const [awards, sessions, runs] = await Promise.all([
    db
      .from("student_point_awards")
      .select("created_at")
      .eq("student_id", clerkId)
      .gte("created_at", since)
      .limit(5000),
    db
      .from("catalog_practice_sessions")
      .select("started_at, completed_at")
      .eq("student_id", clerkId)
      .gte("started_at", since)
      .limit(2000),
    // The quiz flows' runs (Daily 10, sets, quizzes, tests); absent before that merge.
    db
      .from("quiz_runs")
      .select("completed_at")
      .eq("student_id", clerkId)
      .not("completed_at", "is", null)
      .gte("completed_at", since)
      .limit(2000),
  ]);
  const days = new Set<string>();
  for (const r of (awards.data ?? []) as { created_at: string }[]) days.add(dayKey(r.created_at));
  for (const r of (sessions.data ?? []) as { started_at: string; completed_at: string | null }[]) {
    days.add(dayKey(r.started_at));
    if (r.completed_at) days.add(dayKey(r.completed_at));
  }
  for (const r of (runs.data ?? []) as { completed_at: string }[]) days.add(dayKey(r.completed_at));
  return [...days].sort();
}

async function hasTutorFor(db: Db, userId: string): Promise<boolean> {
  const [cohort, tutor] = await Promise.all([
    db
      .from("cohort_members")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("left_at", null),
    db
      .from("tutor_assignments")
      .select("student_user_id", { count: "exact", head: true })
      .eq("student_user_id", userId)
      .is("ended_at", null),
  ]);
  return (cohort.count ?? 0) > 0 || (tutor.count ?? 0) > 0;
}

export async function loadStudentContext(): Promise<StudentContext> {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId, isImpersonating } = await resolveEffectiveClerkId(realUserId);
  const db = createAdminClient() as unknown as Db;

  const [{ data: user }, { data: sub }] = await Promise.all([
    db.from("users").select("*").eq("clerk_id", clerkId).maybeSingle(),
    db.from("subscriptions").select("*").eq("user_id", clerkId).maybeSingle(),
  ]);
  const row = (user ?? null) as Record<string, unknown> | null;
  if (!row || typeof row.id !== "string") redirect("/onboarding");

  const userId = row.id as string;
  // The most generous of the student's own subscription, purchases, school seat and tutor code.
  const resolved = await getPlan(clerkId).catch((error: unknown) => {
    console.error("[student] plan lookup failed:", error instanceof Error ? error.message : error);
    return null;
  });
  const plan = resolved ? studentPlan(resolved.planId, resolved.entitlements) : studentPlan("free");
  const [days, tutor, homeworkOpen] = await Promise.all([
    practiceDaysFor(db, clerkId),
    hasTutorFor(db, userId),
    countOpenHomework({ userId, clerkId }),
  ]);
  const testType = row.test_type === "psat" || row.test_type === "sat" ? row.test_type : null;

  return {
    clerkId,
    isImpersonating,
    userId,
    firstName: typeof row.first_name === "string" ? row.first_name : null,
    email: typeof row.email === "string" ? row.email : null,
    testDate: typeof row.sat_test_date === "string" ? row.sat_test_date : null,
    testType,
    plan,
    subscription: (sub ?? null) as Record<string, unknown> | null,
    streak: streaks(days, dayKey(Date.now())),
    practiceDays: days,
    homeworkOpen,
    hasTutor: tutor || homeworkOpen > 0,
    showCalendar: showsCalendar(plan),
  };
}
