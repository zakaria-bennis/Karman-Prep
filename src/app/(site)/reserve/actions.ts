"use server";

// The Reserve a seat form's two calls. Both are checked again on the server (src/lib/reserve/schemas.ts).
import { checkoutReservation, startReservation } from "@/lib/reserve/service";

/** Step 2 is done: keep the family's contact details and tell the founder. */
export async function saveContact(input: unknown) {
  const result = await startReservation(input);
  return result.ok
    ? { ok: true as const, id: result.value.id }
    : { ok: false as const, error: result.error };
}

/** The last step: add the score, the cohort and the way of paying, and open Stripe Checkout. */
export async function payForSeat(input: unknown) {
  const result = await checkoutReservation(input);
  return result.ok
    ? { ok: true as const, url: result.value.url }
    : { ok: false as const, error: result.error };
}
