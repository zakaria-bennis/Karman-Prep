"use server";

// ============================================================
// Server actions for affiliate tutors. Every action re-reads the
// signed-in Clerk id and re-checks rights on the server (see
// src/lib/tutor-affiliate/service.ts); inputs are validated by Zod.
// ============================================================

import { revalidatePath } from "next/cache";
import { affiliateDeps, requireClerkId } from "@/lib/tutor-affiliate/server";
import {
  assignHomeworkSchema,
  cancelHomeworkSchema,
  removeStudentSchema,
} from "@/lib/tutor-affiliate/schemas";
import { regenerateAffiliateCode } from "@/lib/tutor-affiliate/service";
import { tutorStripeCustomerId } from "@/lib/tutor-affiliate/plan-bridge";
import { stripe } from "@/lib/integrations/stripe/client";
import {
  assignHomework,
  cancelHomework,
  removeStudentAndCancelHomework,
} from "@/lib/tutor-affiliate/homework";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function failure(error: unknown): ActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
  };
}

export async function regenerateCodeAction(): Promise<ActionResult> {
  try {
    const clerkId = await requireClerkId();
    const code = await regenerateAffiliateCode(affiliateDeps, { tutorClerkId: clerkId });
    revalidatePath("/tutor");
    return { ok: true, message: `Your new code is ${code}. The old one no longer works.` };
  } catch (error) {
    return failure(error);
  }
}

export async function removeStudentAction(input: { studentUserId: string }): Promise<ActionResult> {
  try {
    const parsed = removeStudentSchema.parse(input);
    const clerkId = await requireClerkId();
    await removeStudentAndCancelHomework(affiliateDeps, {
      actorClerkId: clerkId,
      studentUserId: parsed.studentUserId,
    });
    revalidatePath("/tutor");
    return { ok: true, message: "Removed. Their seat is free again." };
  } catch (error) {
    return failure(error);
  }
}

export async function assignHomeworkAction(input: {
  studentClerkId: string;
  kind: string;
  targetId: string | null;
  dueOn: string;
  note: string | null;
}): Promise<ActionResult> {
  try {
    const parsed = assignHomeworkSchema.parse(input);
    const clerkId = await requireClerkId();
    const item = await assignHomework(affiliateDeps, { ...parsed, actorClerkId: clerkId });
    revalidatePath(`/tutor/${parsed.studentClerkId}`);
    return { ok: true, message: `Assigned: ${item.title}.` };
  } catch (error) {
    return failure(error);
  }
}

export async function cancelHomeworkAction(input: {
  homeworkId: string;
  studentClerkId: string;
}): Promise<ActionResult> {
  try {
    const parsed = cancelHomeworkSchema.parse({ homeworkId: input.homeworkId });
    const clerkId = await requireClerkId();
    await cancelHomework(affiliateDeps, { actorClerkId: clerkId, homeworkId: parsed.homeworkId });
    revalidatePath(`/tutor/${encodeURIComponent(input.studentClerkId)}`);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Stripe's customer portal for the tutor plan (card, invoices, cancel), back to /tutor/billing. */
export async function openBillingPortalAction(): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  try {
    const clerkId = await requireClerkId();
    const customer = await tutorStripeCustomerId(clerkId);
    if (!customer)
      return { ok: false, error: "There's no tutor plan billing on this account yet." };
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${appUrl}/tutor/billing`,
    });
    return { ok: true, url: session.url };
  } catch (error) {
    console.warn("[tutor-billing] Stripe portal unavailable:", error);
    return {
      ok: false,
      error: "Stripe's billing page isn't available for this account right now.",
    };
  }
}
