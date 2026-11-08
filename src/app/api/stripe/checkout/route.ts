// ============================================================
// POST /api/stripe/checkout
// Body: { plan, term?, cohortId? } (see createCheckoutBodySchema). Creates a
// Stripe Checkout Session for that plan, with the price found by
// its lookup key. Requires a signed-in Clerk user.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createCheckoutSession, getOrCreateCustomer } from "@/lib/integrations/stripe/client";
import { findStripePrice, isSubscriptionPlan } from "@/lib/integrations/stripe/prices";
import { createCheckoutBodySchema } from "@/lib/integrations/stripe/schemas";
import { createAdminClient } from "@/lib/supabase/server";

/** Subscription statuses that still hold a plan. A second renewing plan
 *  would bill twice, so those users change plan in the Stripe portal. */
const LIVE_STATUSES = new Set(["active", "trialing", "past_due", "incomplete"]);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = createCheckoutBodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const spec = findStripePrice(parsed.data.plan, parsed.data.term);
    if (!spec) {
      return NextResponse.json({ error: "That plan is not sold here" }, { status: 400 });
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const email =
      clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) {
      return NextResponse.json({ error: "No email address found" }, { status: 400 });
    }

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
        return NextResponse.json(
          {
            error:
              "Cohort seats are held after a call with Karman. Apply on the program page, and we'll send the payment link.",
          },
          { status: 403 }
        );
      }
    }

    const { data: subs, error: subsError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (subsError) throw subsError;

    if (isSubscriptionPlan(spec.planId) && subs?.some((s) => LIVE_STATUSES.has(s.status))) {
      return NextResponse.json(
        { error: "You already have a plan. Change it with Manage plan on the billing page." },
        { status: 409 }
      );
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

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[checkout] Error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
