"use server";

// The plan payment page's one call (see page.tsx beside it).
import { z } from "zod";
import { safeAuth } from "@/lib/auth/dev-auth";
import { confirmPlanPaid } from "@/lib/checkout/plan-pay";

const sessionSchema = z.string().regex(/^cs_[A-Za-z0-9_]{10,200}$/);

/** The moment Stripe says the payment is made: the account holds the plan now, so the portal it opens
 *  next already shows it. If this could not be written, Stripe's own message writes it; either way the
 *  payment was taken, so the screen says paid (or, from a bank, that the payment is on its way). */
export async function planPaid(session: string) {
  const id = sessionSchema.safeParse(session);
  const { userId } = await safeAuth();
  const state = id.success && userId ? await confirmPlanPaid(userId, id.data) : false;
  return { state: state || ("paid" as const) };
}
