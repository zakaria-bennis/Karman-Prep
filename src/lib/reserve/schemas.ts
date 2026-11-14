// What the Reserve a seat form sends, checked the same way in the browser and on the server.
import { z } from "zod";
import { okEmail, okName, okPhone, okScore } from "@/lib/marketing/lead-rules";
import { COHORT_PAYMENT_OPTIONS } from "@/lib/integrations/stripe/cohort-installments";

const line = (max: number) =>
  z
    .string()
    .transform((v) =>
      v
        .replace(/[\p{C}]/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .pipe(z.string().min(1).max(max));
const name = (max: number) => line(max).refine(okName);

/** Step 2: who the family is. Saved at once, so an unfinished reservation can be followed up. */
export const contactSchema = z.object({
  filledBy: z.enum(["parent", "student"]),
  parentFirst: name(40),
  parentLast: name(40),
  parentEmail: z.string().trim().toLowerCase().max(254).refine(okEmail),
  parentPhone: z.string().trim().max(24).refine(okPhone),
  studentFirst: name(40),
  /** A hidden field people never see; anything in it means a bot filled the form. */
  company: z.literal("").optional(),
});
export type Contact = z.infer<typeof contactSchema>;

/** Steps 3 and 4: the starting score, the cohort and how the seat is paid. */
export const seatSchema = z.object({
  reservationId: z.string().uuid(),
  /** "" when the student has not taken an SAT yet. */
  startScore: z
    .string()
    .trim()
    .refine((v) => v === "" || okScore(v, 400)),
  programId: z.string().min(1).max(60),
  payment: z.enum(COHORT_PAYMENT_OPTIONS),
});
export type Seat = z.infer<typeof seatSchema>;
