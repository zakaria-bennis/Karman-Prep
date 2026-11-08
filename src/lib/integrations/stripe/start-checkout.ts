// ============================================================
// startCheckout: one Stripe Checkout Session for one plan, for a
// signed-in user. Used by POST /api/stripe/checkout (the billing page)
// and by GET /checkout/start (the pricing page's plan buttons, which
// go straight to checkout; founder, 2026-11-08). Server only.
// ============================================================

import { currentUser } from "@clerk/nextjs/server";
import { createCheckoutSession, getOrCreateCustomer } from "./client";
import { findStripePrice, isSubscriptionPlan } from "./prices";
import { createCheckoutBodySchema } from "./schemas";
import { createAdminClient } from "@/lib/supabase/server";

/** Subscription statuses that still hold a plan. A second renewing plan
 *  would bill twice, so those users change plan in the Stripe portal. */
const LIVE_STATUSES = new Set(["active", "trialing", "past_due", "incomplete"]);

export type StartCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; status: number; error: string; issues?: unknown };

/** The signed-in user's email: Clerk first, then the users table (the dev sign-in bypass has no Clerk session). */
async function emailFor(userId: string): Promise<string | null> {
  try {
    const clerkUser = await currentUser();
    const email =
      clerkUser?.primaryEmailAddress?.emailAddress ?? clerkUser?.emailAddresses[0]?.emailAddress;
    if (email) return email;
  } catch {
    // No Clerk session in this request (dev bypass); fall through to the database.
  }
  const { data } = await createAdminClient()
    .from("users")
    .select("email")
    .eq("clerk_id", userId)
    .maybeSingle();
  return data?.email ?? null;
}

/**
 * Validates `input` ({ plan, term?, cohortId? }) with Zod and opens Stripe Checkout for that
 * plan. Cohort seats are sold only to a student Karman already added to that cohort after the
 * call; someone with a live renewing plan is sent to Manage plan instead of paying twice.
 */
export async function startCheckout(userId: string, input: unknown): Promise<StartCheckoutResult> {
  const parsed = createCheckoutBodySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, status: 400, error: "Invalid request body", issues: parsed.error.issues };
  }
  const spec = findStripePrice(parsed.data.plan, parsed.data.term);
  if (!spec) return { ok: false, status: 400, error: "That plan is not sold here" };

  const email = await emailFor(userId);
  if (!email) return { ok: false, status: 400, error: "No email address found" };

  const supabase = createAdminClient();

  // Families join a call before any cohort seat. Karman adds the student to a
  // cohort after the call; only then can that seat be paid here.
  if (spec.planId === "cohort") {
    const { data: me } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();
    const { data: seat } =
      me && parsed.data.cohortId
        ? await supabase
            .from("cohort_members")
            .select("cohort_id")
            .eq("cohort_id", parsed.data.cohortId)
            .eq("user_id", me.id)
            .is("left_at", null)
            .maybeSingle()
        : { data: null };
    if (!seat) {
      return {
        ok: false,
        status: 403,
        error:
          "Cohort seats are held after a call with Karman. Apply on the program page, and we'll send the payment link.",
      };
    }
  }

  const { data: subs, error: subsError } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (subsError) throw subsError;

  if (isSubscriptionPlan(spec.planId) && subs?.some((s) => LIVE_STATUSES.has(s.status))) {
    return {
      ok: false,
      status: 409,
      error: "You already have a plan. Change it with Manage plan on the billing page.",
    };
  }

  const customerId =
    subs?.find((s) => s.stripe_customer_id)?.stripe_customer_id ??
    (await getOrCreateCustomer(userId, email)).id;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const session = await createCheckoutSession({
    customerId,
    spec,
    userId,
    cohortId: parsed.data.cohortId,
    // Tutors land back on billing; students go to their dashboard.
    successUrl:
      spec.planId === "tutor-affiliate"
        ? `${appUrl}/billing`
        : `${appUrl}/dashboard/student?welcome=1`,
    cancelUrl: `${appUrl}/pricing`,
  });
  if (!session.url) return { ok: false, status: 500, error: "Stripe returned no checkout link" };
  return { ok: true, url: session.url };
}
