"use server";
/*
 * Parent portal actions: open Stripe's customer portal for the family (test mode tonight),
 * write to the Karman Prep team from Messages, type in a real SAT score, and choose alerts.
 * Inputs are checked with Zod and every action re-checks the parent's link to the student.
 * Nothing here sends an email or a text: a message lands in the team's inbox in admin.
 */
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import {
  createTestCustomer,
  customerPortalUrl,
  isPlaceholderCustomer,
  mayCreateTestCustomer,
} from "@/lib/billing-portal/stripe";
import { DAILY_EMAIL_TIMES } from "@/lib/parent/daily-email-schedule";
import { saveDailyEmailChoice } from "@/lib/parent/daily-email-settings";
import { acceptInvite, LINK_CODE_PATTERN, normalizeLinkCode } from "@/lib/parent/invites";
import { postFamilyMessage, saveAlertPrefs, saveOfficialScore } from "@/lib/parent/messages";
import { KIND_LABEL, NEEDS_SESSION, sendMessageInput } from "@/lib/parent/messages-model";
import { requireChild, requireParentContext, sessionsFor } from "@/lib/parent/server";
import { untypedAdmin } from "@/lib/school/db";
import { claudeAssistant } from "@/lib/message-assistant/claude";
import { isAssistantOn, readFamily } from "@/lib/message-assistant/server";
import { officialScoreInput } from "@/lib/parent/test-day";
import { createAdminClient } from "@/lib/supabase/server";

const studentSchema = z.object({ studentId: z.string().uuid() });

function back(path: string, key: "done" | "error", message: string): never {
  redirect(`${path}?${key}=${encodeURIComponent(message)}`);
}

export async function openFamilyBillingAction(formData: FormData) {
  const ctx = await requireParentContext();
  const parsed = studentSchema.safeParse({ studentId: formData.get("studentId") });
  if (!parsed.success) redirect("/dashboard/parent");
  const child = await requireChild(ctx, parsed.data.studentId);
  const page = `/dashboard/parent/${child.id}/billing`;
  const supabase = createAdminClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", child.clerkId)
    .maybeSingle();
  if (!sub?.stripe_customer_id) back(page, "error", `${child.firstName} has no paid plan yet.`);
  let customerId = sub.stripe_customer_id as string;
  if (isPlaceholderCustomer(customerId) && !mayCreateTestCustomer())
    back(page, "error", "Billing is not set up for this account yet.");
  let url: string;
  try {
    if (isPlaceholderCustomer(customerId)) {
      const placeholder = customerId;
      customerId = await createTestCustomer({
        email: ctx.viewer.email,
        name: child.name,
        metadata: { student_clerk_id: child.clerkId, replaced_placeholder: placeholder },
      });
      const { error } = await supabase
        .from("subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", child.clerkId)
        .eq("stripe_customer_id", placeholder);
      if (error) throw error;
    }
    url = await customerPortalUrl(customerId, page);
  } catch (error) {
    console.error("[parent] billing portal failed", error);
    back(page, "error", "Stripe could not open billing. Try again in a minute.");
  }
  redirect(url);
}

const linkCodeSchema = z
  .string()
  .max(20)
  .transform(normalizeLinkCode)
  .refine((code) => LINK_CODE_PATTERN.test(code));

const LINK_PAGE = "/dashboard/parent/link";

/** A parent types the code from their student's "Invite a parent" page and is linked. */
export async function linkStudentWithCodeAction(formData: FormData) {
  const ctx = await requireParentContext();
  if (ctx.isAdmin) back(LINK_PAGE, "error", "An admin account can't be linked to a student.");
  const parsed = linkCodeSchema.safeParse(String(formData.get("code") ?? ""));
  if (!parsed.success) back(LINK_PAGE, "error", "Codes are 8 letters and numbers, like K7Q2-MP4X.");
  const result = await acceptInvite({ code: parsed.data }, ctx.viewer.userId);
  if (!result.ok)
    back(
      LINK_PAGE,
      "error",
      result.reason === "self"
        ? "That code is for your own account."
        : "That code didn't work. Check it, or ask your student for a new one: each code works once."
    );
  redirect(`/dashboard/parent/${result.studentId}`);
}

const SETTINGS_PAGE = "/dashboard/parent/settings";
const dailyEmailSchema = z.object({ time: z.union([z.enum(DAILY_EMAIL_TIMES), z.literal("off")]) });

/** The parent picks when the daily email arrives (their own time zone), or turns it off. */
export async function saveDailyEmailTimeAction(formData: FormData) {
  const ctx = await requireParentContext();
  const parsed = dailyEmailSchema.safeParse({ time: formData.get("time") });
  if (!parsed.success) back(SETTINGS_PAGE, "error", "Pick a time from the list.");
  try {
    await saveDailyEmailChoice(
      ctx.viewer.userId,
      parsed.data.time === "off" ? null : parsed.data.time
    );
  } catch (error) {
    console.error("[parent] daily email time could not be saved", error);
    back(SETTINGS_PAGE, "error", "That didn't save. Try again in a minute.");
  }
  back(
    SETTINGS_PAGE,
    "done",
    parsed.data.time === "off" ? "Daily email turned off." : "Daily email time saved."
  );
}

/** A parent writes to the team, or asks to miss, move or book a session. */
export async function sendFamilyMessageAction(formData: FormData) {
  const ctx = await requireParentContext();
  const parsed = sendMessageInput.safeParse({
    studentId: formData.get("studentId"),
    kind: formData.get("kind") ?? "message",
    sessionId: formData.get("sessionId") ?? "",
    body: formData.get("body") ?? "",
  });
  const studentId = String(formData.get("studentId") ?? "");
  const page = /^[0-9a-f-]{36}$/i.test(studentId)
    ? `/dashboard/parent/${studentId}/messages`
    : "/dashboard/parent";
  if (!parsed.success) back(page, "error", parsed.error.issues[0]?.message ?? "Check the message.");
  const child = await requireChild(ctx, parsed.data.studentId);
  if (ctx.isAdmin && !ctx.children.some((c) => c.id === child.id))
    back(page, "error", "Admins answer families from the team inbox in admin.");
  let sessionStartsAt: string | null = null;
  if (parsed.data.sessionId) {
    // Only a session of this child that hasn't ended yet.
    const { upcoming } = await sessionsFor(untypedAdmin(), child, new Date());
    const session = upcoming.find((s) => s.id === parsed.data.sessionId);
    if (!session) back(page, "error", "That session isn't coming up any more. Pick another.");
    sessionStartsAt = session.startsAt;
  } else if (NEEDS_SESSION.has(parsed.data.kind)) {
    back(page, "error", "Pick the session first.");
  }
  try {
    await postFamilyMessage({
      parentUserId: ctx.viewer.userId,
      studentUserId: child.id,
      authorUserId: ctx.viewer.userId,
      authorRole: "parent",
      kind: parsed.data.kind,
      sessionRef: parsed.data.sessionId ?? null,
      sessionStartsAt,
      body: parsed.data.body,
    });
  } catch (error) {
    console.error("[parent] message could not be saved", error);
    back(page, "error", "That didn't send. Try again in a minute.");
  }
  // The team's assistant reads the new message after the response is sent. It only sorts and
  // drafts for the team; it never writes to the family.
  if (isAssistantOn()) {
    const parentUserId = ctx.viewer.userId;
    after(() =>
      readFamily(parentUserId, child.id, { client: claudeAssistant() }).catch((e: unknown) =>
        console.error("[assistant] read after a parent message failed", e)
      )
    );
  }
  back(
    page,
    "done",
    parsed.data.kind === "message"
      ? "Sent to the Karman Prep team. We usually answer within a day."
      : `${KIND_LABEL[parsed.data.kind]} request sent. We'll confirm here.`
  );
}

/** A parent (or admin) types in a real College Board score. */
export async function saveOfficialScoreAction(formData: FormData) {
  const ctx = await requireParentContext();
  const today = new Date().toISOString().slice(0, 10);
  const studentId = String(formData.get("studentId") ?? "");
  const page = /^[0-9a-f-]{36}$/i.test(studentId)
    ? `/dashboard/parent/${studentId}/progress`
    : "/dashboard/parent";
  const parsed = officialScoreInput(today).safeParse({
    studentId,
    testDate: formData.get("testDate"),
    readingWriting: formData.get("readingWriting"),
    math: formData.get("math"),
  });
  if (!parsed.success) back(page, "error", parsed.error.issues[0]?.message ?? "Check the score.");
  const child = await requireChild(ctx, parsed.data.studentId);
  try {
    await saveOfficialScore({
      studentUserId: child.id,
      enteredByUserId: ctx.viewer.userId,
      testDate: parsed.data.testDate,
      readingWriting: parsed.data.readingWriting,
      math: parsed.data.math,
    });
  } catch (error) {
    console.error("[parent] official score could not be saved", error);
    back(page, "error", "That didn't save. Try again in a minute.");
  }
  back(page, "done", `Saved: ${parsed.data.readingWriting + parsed.data.math} on the SAT.`);
}

const alertsSchema = z.object({
  lateHomework: z.boolean(),
  missedSession: z.boolean(),
});

/** Which alerts the parent wants. Alerts send nothing until PARENT_ALERTS=on. */
export async function saveAlertsAction(formData: FormData) {
  const ctx = await requireParentContext();
  const prefs = alertsSchema.parse({
    lateHomework: formData.get("lateHomework") === "on",
    missedSession: formData.get("missedSession") === "on",
  });
  try {
    await saveAlertPrefs(ctx.viewer.userId, prefs);
  } catch (error) {
    console.error("[parent] alert choices could not be saved", error);
    back(SETTINGS_PAGE, "error", "That didn't save. Try again in a minute.");
  }
  back(SETTINGS_PAGE, "done", "Alert choices saved.");
}
