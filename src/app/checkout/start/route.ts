// ============================================================
// GET /checkout/start?plan=practice&term=month
// The plan buttons: a signed-in visitor goes straight to the payment
// for that plan (our own page for Practice and Pro, Stripe's for the rest). An account comes before any payment (founder,
// 2026-11-25), so a visitor without one goes through Get started and
// comes back here with the same plan.
// If checkout can't open (already on a plan, a cohort seat not held
// yet), the visitor lands on Billing with the plan picked, or on the
// page startCheckout names for that refusal.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { visitorOrigin } from "@/lib/checkout/origin";
import { safeAuth } from "@/lib/auth/dev-auth";
import { startCheckout } from "@/lib/integrations/stripe/start-checkout";

/** Only these query values pass through; startCheckout validates them again. */
const querySchema = z.object({
  plan: z.string().trim().max(40).optional(),
  term: z.string().trim().max(10).optional(),
  cohortId: z.string().trim().max(60).optional(),
  payment: z.string().trim().max(20).optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const origin = visitorOrigin(req);
  const query = querySchema.safeParse({
    plan: searchParams.get("plan") ?? undefined,
    term: searchParams.get("term") ?? undefined,
    cohortId: searchParams.get("cohortId") ?? undefined,
    payment: searchParams.get("payment") ?? undefined,
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
    // Stripe's page, or our own payment page (a path on this site)
    if (result.ok) return NextResponse.redirect(new URL(result.url, origin), 303);
    console.warn(`[checkout/start] ${result.status}: ${result.error}`);
    if (result.redirect) return NextResponse.redirect(new URL(result.redirect, origin), 303);
  } catch (error) {
    console.error("[checkout/start] Error:", error);
  }
  const billing = new URL("/billing", origin);
  if (input.plan) billing.searchParams.set("plan", input.plan);
  if (input.term) billing.searchParams.set("term", input.term);
  return NextResponse.redirect(billing, 303);
}
