"use server";

/*
 * The student's Settings actions: their choices (kept with the account), their name and picture,
 * their test date, and a parent's invite. Each one acts only on the signed-in student's own
 * account; an admin previewing a student can look but not change anything (own-student.ts).
 */
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDevAuthBypassActive } from "@/lib/auth/dev-auth";
import { appUrl } from "@/lib/billing-portal/stripe";
import { createInvite } from "@/lib/parent/invites";
import { dayKey } from "@/lib/student/streak";
import {
  TEST_TYPES,
  describeTest,
  testDateProblem,
  type TestType,
} from "@/components/student-portal/settings/test-dates";
import { mergePrefs, ownStudent, portalDb, type Failure } from "./own-student";
import { isPhotoUrl, prefsPatchSchema } from "./prefs";
import { emptySchema, nameSchema } from "./settings-schemas";

// ---------------------------------------------------------------- choices

const prefsSchema = z.object({ patch: prefsPatchSchema }).strict();

/** Saves changed choices (the client sends one change set after the student stops moving a
 *  control). Nothing on the page is redrawn from the server for this. */
export async function actionSavePrefs(input: unknown): Promise<{ ok: true } | Failure> {
  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That choice could not be saved." };
  const who = await ownStudent();
  if (!who.ok) return who;
  return mergePrefs(who.student.id, parsed.data.patch);
}

// ---------------------------------------------------------------- name

export async function actionSaveName(
  input: unknown
): Promise<{ ok: true; first: string; last: string } | Failure> {
  const parsed = nameSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your name." };
  const who = await ownStudent();
  if (!who.ok) return who;
  const { first, last } = parsed.data;
  const { error } = await portalDb()
    .from("users")
    .update({ first_name: first, last_name: last || null })
    .eq("id", who.student.id);
  if (error) {
    console.error("[settings] name save failed:", error.message);
    return { ok: false, error: "That didn't save. Try again in a moment." };
  }
  // Clerk keeps the name too (its sign-in emails greet the student). The local sign-in bypass has
  // no Clerk account behind it, so it is left alone there.
  if (!isDevAuthBypassActive()) {
    try {
      const clerk = await clerkClient();
      await clerk.users.updateUser(who.student.clerkId, { firstName: first, lastName: last });
    } catch (e) {
      console.error("[settings] Clerk name update failed:", e instanceof Error ? e.message : e);
    }
  }
  revalidatePath("/dashboard/student");
  return { ok: true, first, last };
}

// ---------------------------------------------------------------- picture

/** Copies the student's Clerk picture (just set or removed on the page) into the account: the portal
 *  draws it, and tutors see it (users.avatar_url). The address is read from Clerk, never sent. */
export async function actionSyncPhoto(
  input: unknown
): Promise<{ ok: true; photo: string | null } | Failure> {
  if (!emptySchema.safeParse(input).success) return { ok: false, error: "Try that again." };
  const who = await ownStudent();
  if (!who.ok) return who;
  if (isDevAuthBypassActive()) return { ok: false, error: "Pictures need a real sign-in." };
  let image: string | null = null;
  let has = false;
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(who.student.clerkId);
    image = user.imageUrl || null;
    has = user.hasImage;
  } catch (e) {
    console.error("[settings] Clerk picture read failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "Your picture didn't save. Try again in a moment." };
  }
  const photo = has && isPhotoUrl(image) ? image : null;
  const saved = await mergePrefs(who.student.id, { photo });
  if (!saved.ok) return saved;
  const { error } = await portalDb()
    .from("users")
    .update({ avatar_url: image })
    .eq("id", who.student.id);
  if (error) console.error("[settings] avatar save failed:", error.message);
  return { ok: true, photo };
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
  const db = portalDb();
  const { data: rows } = await db.from("sat_dates").select("test_date").gte("test_date", today);
  const satDates = ((rows ?? []) as { test_date: string }[]).map((r) => r.test_date.slice(0, 10));
  const problem = testDateProblem(testType, testDate, today, satDates);
  if (problem) return { ok: false, error: problem };

  const { error } = await db
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

// ---------------------------------------------------------------- a parent's invite

/** Makes a fresh link that invites a parent (any older open link stops working), for the student
 *  to send from their own email. */
export async function actionParentInviteLink(): Promise<{ ok: true; link: string } | Failure> {
  const who = await ownStudent();
  if (!who.ok) return who;
  try {
    const invite = await createInvite(who.student.id);
    return { ok: true, link: `${appUrl()}/join/parent/${invite.token}` };
  } catch (e) {
    console.error("[account] parent invite failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "The invite didn't save. Try again in a moment." };
  }
}
