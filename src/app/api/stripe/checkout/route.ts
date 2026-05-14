// ============================================================
// POST /api/stripe/checkout
// Creates a Stripe Checkout Session for the selected tier.
// Requires the user to be authenticated via Clerk.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createCheckoutSession, getOrCreateCustomer } from "@/lib/integrations/stripe/client";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { tier } = await req.json();
    if (!tier) {
      return NextResponse.json({ error: "Tier is required" }, { status: 400 });
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) {
      return NextResponse.json({ error: "No email address found" }, { status: 400 });
    }

    // Look up existing Stripe customer ID from Supabase
    const supabase = createAdminClient();
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    const customer = await getOrCreateCustomer(userId, email);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await createCheckoutSession({
      customerId: sub?.stripe_customer_id || customer.id,
      tier,
      userId,
      email,
      successUrl: `${appUrl}/dashboard/student?welcome=1`,
      cancelUrl: `${appUrl}/#pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[checkout] Error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
