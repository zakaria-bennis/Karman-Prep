// ============================================================
// POST /api/stripe/portal
// Default behaviour: open the Stripe Customer Portal.
// With { action: "cancel" }: cancel the subscription in-app
// (useful for dev accounts that don't have a real Stripe customer).
// ============================================================

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe } from "@/lib/integrations/stripe/client";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse optional body (won't exist on standard Manage-Plan clicks)
    let action: string | null = null;
    try {
      const body = await req.json();
      action = typeof body?.action === "string" ? body.action : null;
    } catch {
      // No body — default flow
    }

    const supabase = createAdminClient();
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id, status")
      .eq("user_id", userId)
      .single();

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    }

    // ── Cancel flow (in-app, avoids Stripe portal entirely) ──
    if (action === "cancel") {
      // Dev sub IDs start with 'sub_dev_' — mark canceled in DB, skip Stripe
      if (sub.stripe_subscription_id?.startsWith("sub_dev")) {
        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("user_id", userId);
        return NextResponse.json({ ok: true, mode: "dev" });
      }

      // Real subscription — cancel at period end via Stripe API
      try {
        await stripe.subscriptions.update(sub.stripe_subscription_id, {
          cancel_at_period_end: true,
        });
        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("user_id", userId);
        return NextResponse.json({ ok: true, mode: "stripe" });
      } catch (stripeErr) {
        console.error("[portal] Stripe cancel failed:", stripeErr);
        return NextResponse.json({ error: "Stripe cancel failed" }, { status: 500 });
      }
    }

    // ── Default: open the Stripe Customer Portal ──
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: `${appUrl}/billing`,
      });
      return NextResponse.json({ url: session.url });
    } catch (stripeErr) {
      // Typical in dev: the fake 'cus_dev_*' customer doesn't exist in Stripe.
      // The client treats this as "open the in-app fallback modal".
      console.warn("[portal] Stripe portal unavailable:", stripeErr);
      return NextResponse.json(
        { error: "Stripe portal unavailable for this account" },
        { status: 200 }    // 200 so client parses JSON and uses fallback UI
      );
    }
  } catch (error) {
    console.error("[portal] Error:", error);
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
  }
}
