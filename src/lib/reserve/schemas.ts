// What the Reserve a seat form sends at each step, checked the same way in the browser and on the server.
import { z } from "zod";
import { okEmail, okName, okPhone, okScore } from "@/lib/marketing/lead-rules";
import { COHORT_PAYMENT_OPTIONS } from "@/lib/integrations/stripe/cohort-installments";

const name = (max: number) =>
  z
    .string()
    .transform((v) =>
      v
        .replace(/[\p{C}]/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .pipe(z.string().min(1).max(max).refine(okName));

/** The email step. The lead is saved here, so an unfinished reservation can be followed up. */
export const emailSchema = z.object({
  filledBy: z.enum(["parent", "student"]),
  email: z.string().trim().toLowerCase().max(254).refine(okEmail),
  /** A hidden field people never see; anything in it means a bot filled the form. */
  company: z.literal("").optional(),
});

/** The names step. The phone is optional: "" when it is left out. */
export const detailsSchema = z.object({
  reservationId: z.string().uuid(),
  parentName: name(80),
  studentFirst: name(40),
  phone: z
    .string()
    .trim()
    .max(24)
    .refine((v) => v === "" || okPhone(v)),
});

/** The cohort and how the seat is paid. Nothing else is asked before payment. */
export const seatSchema = z.object({
  reservationId: z.string().uuid(),
  programId: z.string().min(1).max(60),
  payment: z.enum(COHORT_PAYMENT_OPTIONS),
});

export const HARDEST = ["math", "reading", "both", "timing"] as const;

/** Right after paying: what gets the student started. Every answer is a choice or a short line. */
export const registrationSchema = z.object({
  token: z.string().uuid(),
  /** "" when the student has not taken an SAT yet. */
  startScore: z
    .string()
    .trim()
    .refine((v) => v === "" || okScore(v, 400)),
  goalScore: z
    .string()
    .trim()
    .refine((v) => okScore(v, 400)),
  hardest: z.enum(HARDEST),
  /** Anything the tutor should know. Optional, one short paragraph, kept as plain text. */
  note: z
    .string()
    .transform((v) =>
      v
        .replace(/[\p{C}]/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .pipe(z.string().max(400)),
});
export type Registration = z.infer<typeof registrationSchema>;
