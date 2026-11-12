// Zod schema for /admin/schools' "Create school" (actions.ts). Kept apart so it can be unit-tested.
import { z } from "zod";
import { okEmail } from "@/lib/marketing/lead-rules";

/** Today in UTC, as YYYY-MM-DD. */
export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** The free year's default end: the same day next year (Feb 29 becomes Mar 1). */
export function oneYearOut(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear() + 1, now.getUTCMonth(), now.getUTCDate()));
  return isoDay(d);
}

export const createSchoolInput = z.object({
  name: z
    .string()
    .transform((v) =>
      v
        .replace(/[\p{C}]/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .pipe(
      z
        .string()
        .min(1, { message: "Add the school's name." })
        .max(120, { message: "Keep the name under 120 characters." })
    ),
  freeUntil: z.iso
    .date({ message: "Pick the date the free year ends." })
    .refine((v) => v > isoDay(new Date()), { message: "The free year has to end after today." }),
  adminEmail: z
    .string()
    .trim()
    .max(254)
    .refine(okEmail, { message: "That email looks incomplete." })
    .transform((v) => v.toLowerCase()),
  /** The school_call request this school answers, if any (marketing_leads.id). */
  requestId: z
    .union([z.literal(""), z.guid({ message: "That request isn't one we know." })])
    .optional()
    .transform((v) => v || null),
});

export type CreateSchoolInput = z.input<typeof createSchoolInput>;
