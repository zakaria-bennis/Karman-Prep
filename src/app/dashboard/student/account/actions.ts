"use server";

/*
 * The student's account page actions: their test and date, a parent invite and a tutor's code.
 * Each one acts only on the signed-in student's own account. An admin previewing a student
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
} from "@/components/student-portal/account/test-dates";
import { redeemTutorCode } from "@/components/student-portal/account/tutor-code";

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

// ---------------------------------------------------------------- invite a parent

const inviteSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    firstName: z.string().trim().max(60).optional(),
  })
  .strict();

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c
  );

export async function actionInviteParent(
  input: unknown
): Promise<{ ok: true; email: string; sent: boolean; message: string } | Failure> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter your parent's email address." };
  const who = await ownStudent();
  if (!who.ok) return who;
  const { email, firstName } = parsed.data;
  if (who.student.email && who.student.email.toLowerCase() === email) {
    return { ok: false, error: "That's your own email. Enter your parent's." };
  }

  const { error } = await db()
    .from("users")
    .update({ parent_email_collected: email })
    .eq("id", who.student.id);
  if (error) {
    console.error("[account] parent email save failed:", error.message);
    return { ok: false, error: "That didn't save. Try again in a moment." };
  }
  revalidatePath("/dashboard/student/account");

  if (!process.env.RESEND_API_KEY) {
    console.warn("[account] parent invite saved; email is switched off, nothing sent");
    return {
      ok: true,
      email,
      sent: false,
      message: "Saved. Email is switched off in this test copy, so no invite went out.",
    };
  }
  try {
    const { resend, FROM } = await import("@/lib/integrations/resend/client");
    const student = escapeHtml(who.student.first_name?.trim() || "Your student");
    const hello = firstName ? `Hi ${escapeHtml(firstName)},` : "Hello,";
    const site = process.env.NEXT_PUBLIC_APP_URL || "https://karmanprep.com";
    const result = await resend.emails.send({
      from: FROM,
      to: email,
      subject: `${who.student.first_name?.trim() || "Your student"} invited you to Karman`,
      html: `<div style="font-family: system-ui, sans-serif; max-width: 520px; margin: auto; padding: 24px; color: #16181d;">
        <p>${hello}</p>
        <p>${student} is preparing for the SAT with Karman and would like you to follow along.</p>
        <p>Create your parent account at <a href="${site}/auth/sign-up">${site.replace(/^https?:\/\//, "")}</a>, and we'll link it to ${student}'s.</p>
        <p style="color:#5a5c63;font-size:13px;">You got this because ${student} entered your address. If that's a mistake, ignore this email.</p>
      </div>`,
    });
    if (result.error) throw new Error(result.error.message);
    return { ok: true, email, sent: true, message: `Invite sent to ${email}.` };
  } catch (err) {
    console.warn("[account] parent invite email failed:", err instanceof Error ? err.message : err);
    return {
      ok: true,
      email,
      sent: false,
      message: "Saved, but the invite email didn't go out. Try again in a few minutes.",
    };
  }
}

// ---------------------------------------------------------------- a tutor's code

const codeSchema = z.object({ code: z.string().trim().min(1).max(20) }).strict();

export async function actionRedeemTutorCode(
  input: unknown
): Promise<{ ok: true; message: string } | Failure> {
  const parsed = codeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter your tutor's code." };
  const who = await ownStudent();
  if (!who.ok) return who;
  try {
    const r = await redeemTutorCode({
      studentUserId: who.student.id,
      studentClerkId: who.student.clerk_id,
      studentRole: who.student.role,
      rawCode: parsed.data.code,
    });
    if (r.ok) {
      revalidatePath("/dashboard/student", "layout");
      if (r.status === "already_joined")
        return { ok: true, message: `You're already in ${r.tutorName}'s group.` };
      return {
        ok: true,
        message: r.practiceOpen
          ? `You joined ${r.tutorName}'s group. Your Practice plan is on.`
          : `You joined ${r.tutorName}'s group. Practice turns on once plans are switched on in this copy.`,
      };
    }
    switch (r.reason) {
      case "invalid_code":
        return { ok: false, error: "That code doesn't match a tutor. Codes look like ABCD-EFGH." };
      case "not_student":
        return { ok: false, error: "Only a student account can join a tutor's group." };
      case "unavailable":
        return {
          ok: false,
          error: "Tutor codes open once your tutor's plan is live. Check the code with your tutor.",
        };
      case "tutor_inactive":
        return {
          ok: false,
          error: `${r.tutorName}'s tutor plan isn't active right now, so this code can't add you yet.`,
        };
      case "full":
        return { ok: false, error: `${r.tutorName}'s group is full. Ask them about a spot.` };
      case "removed_by_tutor":
        return {
          ok: false,
          error: `${r.tutorName} removed you from this group. Ask them for a new code.`,
        };
      case "linked_elsewhere":
        return {
          ok: false,
          error: `You're already in ${r.currentTutorName}'s group. Ask them to remove you first, then use this code.`,
        };
    }
  } catch (err) {
    console.error("[account] tutor code failed:", err instanceof Error ? err.message : err);
  }
  return { ok: false, error: "That didn't go through. Try again in a moment." };
}
