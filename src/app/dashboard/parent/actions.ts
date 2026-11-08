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
import { FROM, resend } from "@/lib/integrations/resend/client";
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
    weekOf: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/Chicago" }),
  };
  if (!process.env.RESEND_API_KEY) {
    console.info("[parent] weekly recap not sent: email is switched off here", {
      to: ctx.viewer.email,
      subject: recapSubject(input),
    });
    back(page, "done", "Email is switched off on this computer, so the send was logged instead.");
  }
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
