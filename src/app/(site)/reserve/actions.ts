"use server";

// The Reserve a seat form's calls, before and after payment. Each is checked again on the server (src/lib/reserve/schemas.ts).
import {
  checkoutReservation,
  saveDetails,
  saveRegistration,
  startReservation,
} from "@/lib/reserve/service";

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

/** The last step: add the cohort and the way of paying, and open Stripe Checkout. */
export async function payForSeat(input: unknown) {
  const result = await checkoutReservation(input);
  return result.ok
    ? { ok: true as const, url: result.value.url }
    : { ok: false as const, error: result.error };
}

/** Right after paying: the answers that get the student started. */
export async function saveStart(input: unknown) {
  const result = await saveRegistration(input);
  return result.ok ? { ok: true as const } : { ok: false as const, error: result.error };
}
