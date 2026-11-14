"use server";

// The Reserve a seat form's three calls. Each is checked again on the server (src/lib/reserve/schemas.ts).
import { checkoutReservation, saveDetails, startReservation } from "@/lib/reserve/service";

/** The email step: keep the lead and tell the founder. */
export async function saveEmail(input: unknown) {
  const result = await startReservation(input);
  return result.ok
    ? { ok: true as const, id: result.value.id }
    : { ok: false as const, error: result.error };
}

/** The names step: add them to the saved reservation. */
export async function saveNames(input: unknown) {
  const result = await saveDetails(input);
  return result.ok ? { ok: true as const } : { ok: false as const, error: result.error };
}

/** The last step: add the score, the cohort and the way of paying, and open Stripe Checkout. */
export async function payForSeat(input: unknown) {
  const result = await checkoutReservation(input);
  return result.ok
    ? { ok: true as const, url: result.value.url }
    : { ok: false as const, error: result.error };
}
