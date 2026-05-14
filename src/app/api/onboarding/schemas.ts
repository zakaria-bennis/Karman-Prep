// ============================================================
// Zod schemas for /api/onboarding/* route bodies.
//
// Shape validation only. Tier-conditional rules
// (Private/Elite require availability) live in the route — Zod
// doesn't know which tier the caller is on until we read the DB.
// ============================================================

import { z } from "zod";

export const VALID_HS_YEARS = ["freshman", "sophomore", "junior", "senior"] as const;
export const VALID_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export const VALID_TIMES = ["morning", "afternoon", "evening"] as const;

// Optional-but-shape-validated SAT-style score fields.
// `.nullable()` because the client posts `null` for "skipped"
// rather than omitting the key.
const optionalSectionScore = z.number().int().min(200).max(800).nullable().optional();

const optionalCompositeScore = z.number().int().min(400).max(1600).nullable().optional();

const optionalPsatScore = z.number().int().min(320).max(1520).nullable().optional();

const optionalNullableString = z.string().nullable().optional();

export const onboardingPayloadSchema = z.object({
  // Always required
  satTestDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "satTestDate must be YYYY-MM-DD" }),
  goalSatScore: z
    .number()
    .int({ message: "goalSatScore must be an integer" })
    .min(400, { message: "goalSatScore must be 400-1600" })
    .max(1600, { message: "goalSatScore must be 400-1600" }),
  hsYear: z.enum(VALID_HS_YEARS),

  // Optional academic background
  recentSatMath: optionalSectionScore,
  recentSatReading: optionalSectionScore,
  recentSatTimePressure: z.boolean().nullable().optional(),
  psatScore: optionalPsatScore,

  // Optional — required by the route for Private/Elite tiers
  availableDays: z.array(z.enum(VALID_DAYS)).optional(),
  availableTimes: z.array(z.enum(VALID_TIMES)).optional(),
  timeZone: z.string().min(1).optional(),

  // Always collected, never required
  parentEmail: optionalNullableString,
  parentPhone: optionalNullableString,
  heardAboutStrata: optionalNullableString,

  // Composite-score back-compat (legacy clients may send this)
  recentSatComposite: optionalCompositeScore,
});
