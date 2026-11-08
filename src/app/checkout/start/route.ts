// ============================================================
// GET /checkout/start?plan=practice&term=month
// The pricing page's plan buttons (founder, 2026-11-08): a signed-in
// visitor goes straight to Stripe Checkout for that plan; a visitor
// without an account creates one first and comes back here, with the
// plan carried in the sign-up's redirect_url, then goes to checkout.
// If checkout can't open (already on a plan, a cohort seat not held
// yet), the visitor lands on Billing with the plan picked.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { safeAuth } from "@/lib/auth/dev-auth";
import { startCheckout } from "@/lib/integrations/stripe/start-checkout";

/** Only these query values pass through; startCheckout validates them again. */
const querySchema = z.object({
  plan: z.string().trim().max(40).optional(),
  term: z.string().trim().max(10).optional(),
  cohortId: z.string().trim().max(60).optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const query = querySchema.safeParse({
    plan: searchParams.get("plan") ?? undefined,
    term: searchParams.get("term") ?? undefined,
    cohortId: searchParams.get("cohortId") ?? undefined,
  });
  const input = query.success ? query.data : {};

  // Back here after sign-up, with the same plan.
  const here = new URL("/checkout/start", origin);
  for (const [key, value] of Object.entries(input)) if (value) here.searchParams.set(key, value);

  const { userId } = await safeAuth();
  if (!userId) {
    const signUp = new URL("/auth/sign-up", origin);
    signUp.searchParams.set("redirect_url", `${here.pathname}${here.search}`);
    return NextResponse.redirect(signUp, 303);
  }

  try {
    const result = await startCheckout(userId, input);
    if (result.ok) return NextResponse.redirect(result.url, 303);
    console.warn(`[checkout/start] ${result.status}: ${result.error}`);
  } catch (error) {
    console.error("[checkout/start] Error:", error);
  }
  const billing = new URL("/billing", origin);
  if (input.plan) billing.searchParams.set("plan", input.plan);
  if (input.term) billing.searchParams.set("term", input.term);
  return NextResponse.redirect(billing, 303);
}
