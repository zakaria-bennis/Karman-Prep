// What the server and the browser both need to know about buying hours.
import { z } from "zod";

/** The most hours one payment can buy. */
export const HOURS_MAX = 40;
/** Marks a Stripe payment as one for tutoring hours. */
export const HOURS_KIND = "private_hours";

export const hoursCheckoutBodySchema = z.object({
  hours: z.number().int().min(1).max(HOURS_MAX),
});
