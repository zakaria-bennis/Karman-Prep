// What the server and the browser both need to know about buying hours.
import { z } from "zod";
import { GUARANTEE, PRIVATE_PACKAGES } from "@/lib/marketing/offer";

/** The most hours one payment can buy. */
export const HOURS_MAX = 40;
/** Marks a Stripe payment as one for tutoring hours. */
export const HOURS_KIND = "private_hours";

const SINGLE_CENTS = Math.round(GUARANTEE.private.extraSessionPrice * 100);

/** What a number of hours costs, in cents (founder, 2026-11-17: "the bulk hours should definitely
 *  be cheaper. If they want to buy a whole other bulk package, they can buy it with the same
 *  discount"). Every whole package inside the number is charged at that package's own price from
 *  offer.ts, largest first; the hours left over are single hours. So 20 hours is the Private 20
 *  price, and 25 is that plus five single hours. And no number of hours ever costs more than the
 *  next whole package would: 18 single hours come to more than Private 20, so 18 is charged as 20. */
export function hoursPriceCents(hours: number): number {
  const want = Math.max(0, Math.round(hours));
  // packages that are cheaper than their hours bought singly, largest first
  const bulk = [...PRIVATE_PACKAGES]
    .filter((pack) => pack.price * 100 < pack.hours * SINGLE_CENTS)
    .sort((a, b) => b.hours - a.hours);
  let left = want;
  let total = 0;
  for (const pack of bulk) {
    const packs = Math.floor(left / pack.hours);
    total += packs * pack.price * 100;
    left -= packs * pack.hours;
  }
  total += left * SINGLE_CENTS;
  for (const pack of bulk) {
    const whole = Math.ceil(want / pack.hours) * pack.price * 100;
    if (want > 0 && whole < total) total = whole;
  }
  return total;
}
/** The fewest hours above `hours` that cost no more: 18 hours cost what 20 do, so 20 is offered. */
export function sameForMore(hours: number): number | null {
  const price = hoursPriceCents(hours);
  for (let more = HOURS_MAX; more > hours; more--) if (hoursPriceCents(more) <= price) return more;
  return null;
}
/** How much less than the single-hour price that is, in cents. */
export const hoursSavingCents = (hours: number) =>
  Math.max(0, Math.round(hours)) * SINGLE_CENTS - hoursPriceCents(hours);

export const dollars = (cents: number) =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });

export const hoursBodySchema = z.object({
  hours: z.number().int().min(1).max(HOURS_MAX),
});
export const hoursChangeBodySchema = hoursBodySchema.extend({
  intentId: z.string().regex(/^pi_[A-Za-z0-9]+$/),
});
