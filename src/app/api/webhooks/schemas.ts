// ============================================================
// Zod schemas for /api/webhooks/* route bodies.
//
// These endpoints are bearer-token-gated (Supabase DB webhook
// secret, Cal signing secret, etc.), so Zod is a second line of
// defence — but a payload shape change on Supabase's side could
// otherwise crash the route. Validating the shape gives us a
// clean 400 instead.
// ============================================================

import { z } from "zod";

// Supabase Database Webhook payload for the cohort_members INSERT
// trigger that drives /api/webhooks/seminar-overflow.
// Reference: https://supabase.com/docs/guides/database/webhooks
export const seminarOverflowBodySchema = z.object({
  type: z.string().min(1),
  table: z.string().min(1),
  schema: z.string().min(1),
  record: z
    .object({
      cohort_id: z.string().min(1).optional(),
      left_at: z.string().nullable().optional(),
    })
    .optional(),
  old_record: z.unknown().optional(),
});
