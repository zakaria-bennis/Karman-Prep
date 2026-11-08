// ============================================================
// Zod schemas for every scholarship server action, plus the
// row shapes read back from the database (the tables are newer
// than the generated Supabase types, so rows are parsed here).
// ============================================================

import { z } from "zod";

export const MAX_REPORT_BYTES = 10 * 1024 * 1024;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker")
  .refine((s) => !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime()), "That date doesn't exist");

export const satTotalScore = z.coerce
  .number()
  .int("Whole numbers only")
  .min(400, "SAT totals run from 400 to 1600")
  .max(1600, "SAT totals run from 400 to 1600")
  .refine((n) => n % 10 === 0, "SAT totals end in 0");

export const submitClaimFieldsSchema = z.object({
  cohortId: z.guid(),
  declaredTotalScore: satTotalScore,
  declaredTestDate: isoDate.refine(
    (s) => s <= new Date().toISOString().slice(0, 10),
    "The test date can't be in the future"
  ),
});

export const reportFileSchema = z
  .instanceof(File, { message: "Choose your score report PDF" })
  .refine((f) => f.size > 0, "The file is empty")
  .refine((f) => f.size <= MAX_REPORT_BYTES, "The file is larger than 10 MB")
  .refine(
    (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    "Upload the PDF from your College Board account"
  );

export const claimIdSchema = z.object({ claimId: z.guid() });

export const approveClaimSchema = z.object({
  claimId: z.guid(),
  /** Required when the automatic check didn't pass (enforced in the action). */
  note: z.string().trim().max(2000).optional().default(""),
});

export const rejectClaimSchema = z.object({
  claimId: z.guid(),
  reason: z.string().trim().min(3, "Say why, so the family can be told").max(2000),
});

export const payClaimSchema = z.object({
  claimId: z.guid(),
  paymentIntentId: z
    .string()
    .trim()
    .regex(/^pi_[A-Za-z0-9]+$/, "A payment id starts with pi_")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const claimListFilterSchema = z.object({
  status: z.enum(["all", "submitted", "approved", "rejected", "paid"]).catch("submitted"),
  q: z.string().trim().max(100).catch(""),
});

const reasonSchema = z.object({
  code: z.string(),
  level: z.enum(["ok", "warn", "fail"]),
  message: z.string(),
});

export const claimRowSchema = z.object({
  id: z.string(),
  cohort_id: z.string(),
  user_id: z.string(),
  status: z.enum(["submitted", "approved", "rejected", "paid"]),
  report_storage_driver: z.enum(["local", "r2"]),
  report_storage_key: z.string(),
  report_file_name: z.string(),
  report_size_bytes: z.number(),
  report_sha256: z.string(),
  submitted_at: z.string(),
  declared_total_score: z.number().nullable(),
  declared_test_date: z.string().nullable(),
  extracted_name: z.string().nullable(),
  extracted_test_date: z.string().nullable(),
  extracted_total_score: z.number().nullable(),
  extracted_rw_score: z.number().nullable(),
  extracted_math_score: z.number().nullable(),
  check_verdict: z.enum(["pass", "warn", "fail"]).nullable(),
  check_reasons: z.array(reasonSchema).catch([]),
  check_metadata: z.record(z.string(), z.unknown()).catch({}),
  checked_at: z.string().nullable(),
  reviewed_by: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  review_reason: z.string().nullable(),
  payout_status: z.enum(["none", "processing", "refunded", "paid", "failed"]),
  stripe_livemode: z.boolean().nullable(),
  stripe_payment_intent_id: z.string().nullable(),
  stripe_customer_id: z.string().nullable(),
  stripe_refund_id: z.string().nullable(),
  refund_amount_cents: z.number().nullable(),
  refunded_at: z.string().nullable(),
  bonus_method: z.enum(["transfer", "customer_balance"]).nullable(),
  stripe_bonus_id: z.string().nullable(),
  bonus_amount_cents: z.number().nullable(),
  bonus_paid_at: z.string().nullable(),
  payout_error: z.string().nullable(),
  payout_attempts: z.number(),
  paid_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ClaimRow = z.infer<typeof claimRowSchema>;

export const eventRowSchema = z.object({
  id: z.number(),
  claim_id: z.string(),
  actor_user_id: z.string().nullable(),
  kind: z.string(),
  detail: z.record(z.string(), z.unknown()).catch({}),
  created_at: z.string(),
});

export type EventRow = z.infer<typeof eventRowSchema>;
