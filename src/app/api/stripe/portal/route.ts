// ============================================================
// POST /api/stripe/portal
// Creates a Stripe Customer Portal session for self-serve
// subscription management (upgrade, downgrade, cancel).
// ============================================================

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${appUrl}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[portal] Error:", error);
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
  }
}
