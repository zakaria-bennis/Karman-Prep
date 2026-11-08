"use server";

/*
 * The student's Settings page action: their test (SAT or PSAT) and its date. Each one acts only on the signed-in student's own account. An admin previewing a student
 * can look but not change anything.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { dayKey } from "@/lib/student/streak";
import {
  TEST_TYPES,
  describeTest,
  testDateProblem,
  type TestType,
} from "@/components/student-portal/settings/test-dates";

type Failure = { ok: false; error: string };

const PREVIEW = "You're previewing this student, so changes are off.";

/* The client types are generated before users.test_type existed; the column is added in
   supabase/migrations/20261108084000_student_portal_test_type.sql. */
type Db = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): { maybeSingle(): PromiseLike<{ data: unknown }> };
      gte(column: string, value: string): PromiseLike<{ data: unknown }>;
    };
    update(values: Record<string, unknown>): {
      eq(column: string, value: string): PromiseLike<{ error: { message: string } | null }>;
    };
  };
};
const db = () => createAdminClient() as unknown as Db;

type Student = {
  id: string;
  clerk_id: string;
  role: string | null;
  first_name: string | null;
  email: string | null;
};

async function ownStudent(): Promise<{ ok: true; student: Student } | Failure> {
  const { userId } = await safeAuth();
  if (!userId) return { ok: false, error: "Sign in again to make changes." };
  const { clerkId, isImpersonating } = await resolveEffectiveClerkId(userId);
  if (isImpersonating) return { ok: false, error: PREVIEW };
  const { data } = await db()
    .from("users")
    .select("id, clerk_id, role, first_name, email")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  const student = data as Student | null;
  if (!student) return { ok: false, error: "We couldn't find your account. Sign in again." };
  if (student.role !== "student")
    return { ok: false, error: "Only a student account can change this." };
  return { ok: true, student };
}

// ---------------------------------------------------------------- the test and its date

const testSchema = z
  .object({
    testType: z.enum(TEST_TYPES),
    testDate: z.string().trim().max(10).nullable(),
  })
  .strict();

export async function actionSaveTest(
  input: unknown
): Promise<{ ok: true; testType: TestType; testDate: string | null; summary: string } | Failure> {
  const parsed = testSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick SAT or PSAT, and a date." };
  const who = await ownStudent();
  if (!who.ok) return who;
  const { testType } = parsed.data;
  const testDate = parsed.data.testDate || null;
  const today = dayKey(Date.now());
  const { data: rows } = await db().from("sat_dates").select("test_date").gte("test_date", today);
  const satDates = ((rows ?? []) as { test_date: string }[]).map((r) => r.test_date);
  const problem = testDateProblem(testType, testDate, today, satDates);
  if (problem) return { ok: false, error: problem };

  const { error } = await db()
    .from("users")
    .update({ test_type: testType, sat_test_date: testDate })
    .eq("id", who.student.id);
  if (error) {
    console.error("[account] test save failed:", error.message);
    return { ok: false, error: "That didn't save. Try again in a moment." };
  }
  revalidatePath("/dashboard/student", "layout");
  return { ok: true, testType, testDate, summary: describeTest(testType, testDate) };
}
