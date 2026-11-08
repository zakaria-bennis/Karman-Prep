// ============================================================
// POST /api/stripe/checkout
// Body: { plan, term?, cohortId? } (see createCheckoutBodySchema). Creates a
// Stripe Checkout Session for that plan, with the price found by
// its lookup key. Requires a signed-in Clerk user. The rules live in
// startCheckout (shared with GET /checkout/start).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { startCheckout } from "@/lib/integrations/stripe/start-checkout";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const result = await startCheckout(userId, await req.json().catch(() => ({})));
    if (!result.ok) {
      return NextResponse.json(
        result.issues ? { error: result.error, issues: result.issues } : { error: result.error },
        { status: result.status }
      );
    }
    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error("[checkout] Error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
