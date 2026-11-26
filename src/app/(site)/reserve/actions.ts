"use server";

// The Reserve a seat form's calls, before and after payment. Each is checked again on the server
// (src/lib/reserve/schemas.ts). A reservation is made by an account (founder, 2026-11-25: nobody pays
// before they have one), so the calls that start one or open a payment need the visitor signed in.
import { reserveBuyer } from "@/lib/reserve/buyer";
import {
  checkoutReservation,
  saveDetails,
  saveRegistration,
  startReservation,
} from "@/lib/reserve/service";

/** The first step: keep the lead and tell the founder. A parent's email is their account's. */
export async function saveEmail(input: unknown) {
  const buyer = await reserveBuyer();
  if (!buyer) return { ok: false as const, error: "server" as const };
  const result = await startReservation(input, buyer);
  return result.ok
    ? { ok: true as const, id: result.value.id }
    : { ok: false as const, error: result.error };
}

/** The names step: add them to the saved reservation. */
export async function saveNames(input: unknown) {
  const result = await saveDetails(input);
  return result.ok ? { ok: true as const } : { ok: false as const, error: result.error };
}

/** The last step: add the cohort and the way of paying, and open our payment page. */
export async function payForSeat(input: unknown) {
  const result = await checkoutReservation(input);
  return result.ok
    ? { ok: true as const, url: result.value.url }
    : { ok: false as const, error: result.error };
}

/** On the payment page, the moment Stripe says the payment is made: mark the seat paid now, so the
 *  next screen never has to wait for Stripe's own message. */
export async function seatPaid(reservationId: string, session: string) {
  const id = typeof reservationId === "string" ? reservationId : "";
  const { paymentFor } = await import("@/lib/reserve/service");
  const pay = await paymentFor(id, typeof session === "string" ? session : "");
  return { state: pay?.state ?? ("open" as const) };
}

/** Right after paying: the answers that get the student started. */
export async function saveStart(input: unknown) {
  const result = await saveRegistration(input);
  return result.ok ? { ok: true as const } : { ok: false as const, error: result.error };
}
