"use server";
/*
 * Parent portal actions: open Stripe's customer portal for the family (test mode tonight),
 * and send the weekly recap email to the parent now. Inputs are checked with Zod and every
 * action re-checks the parent's link to the student.
 */
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  appUrl,
  createTestCustomer,
  customerPortalUrl,
  isPlaceholderCustomer,
  mayCreateTestCustomer,
} from "@/lib/billing-portal/stripe";
import { DAILY_EMAIL_TIMES } from "@/lib/parent/daily-email-schedule";
import { saveDailyEmailChoice } from "@/lib/parent/daily-email-settings";
import { acceptInvite, LINK_CODE_PATTERN, normalizeLinkCode } from "@/lib/parent/invites";
import { recapHtml, recapSubject } from "@/lib/parent/recap";
import { loadChildWeek, requireChild, requireParentContext } from "@/lib/parent/server";
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

export async function sendRecapAction(formData: FormData) {
  const ctx = await requireParentContext();
  const parsed = studentSchema.safeParse({ studentId: formData.get("studentId") });
  if (!parsed.success) redirect("/dashboard/parent");
  const child = await requireChild(ctx, parsed.data.studentId);
  const page = `/dashboard/parent/${child.id}/recap`;
  if (!ctx.viewer.email) back(page, "error", "Your account has no email address.");
  const week = await loadChildWeek(child);
  const input = {
    childFirstName: child.firstName,
    parentFirstName: ctx.viewer.firstName,
    week,
    portalUrl: `${appUrl()}/dashboard/parent/${child.id}`,
    weekOf: new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      timeZone: "America/Chicago",
    }),
  };
  if (!process.env.RESEND_API_KEY) {
    console.info("[parent] weekly recap not sent: email is switched off here", {
      to: ctx.viewer.email,
      subject: recapSubject(input),
    });
    back(page, "done", "Email is switched off on this computer, so the send was logged instead.");
  }
  // Loaded only here: the client refuses to start without a key, and email is off locally.
  const { FROM, resend } = await import("@/lib/integrations/resend/client");
  const { error } = await resend.emails.send({
    from: FROM,
    to: ctx.viewer.email,
    subject: recapSubject(input),
    html: recapHtml(input),
  });
  if (error) {
    console.error("[parent] weekly recap send failed", error);
    back(page, "error", "The email could not be sent. Try again later.");
  }
  back(page, "done", `Sent to ${ctx.viewer.email}.`);
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
