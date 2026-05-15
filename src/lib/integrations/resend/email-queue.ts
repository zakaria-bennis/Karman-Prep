// ============================================================
// Resilient email queue — owns retries when Resend errors out.
//
// Pattern: caller wraps the synchronous send in a try/catch. On
// failure it calls `enqueueFailedEmail(...)` instead of letting the
// outer handler 500. The retry cron at /api/cron/retry-failed-emails
// drains the queue with exponential backoff.
//
// Backoff schedule (cumulative since initial failure):
//   attempt 1 → wait 1 min
//   attempt 2 → wait 5 min
//   attempt 3 → wait 30 min
//   attempt 4 → wait 2 h
//   attempt 5 → wait 12 h
//   after 5 attempts → row marked `given_up_at`; admin triages.
//
// Dedupe: `(kind, booking_uid)` collapses redelivery noise. If Cal
// keeps re-firing BOOKING_CREATED for the same booking and the email
// keeps failing, we don't insert 17 separate queue rows — we update
// the existing one's attempts + next_attempt_at.
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export type FailedEmailKind =
  | "booking_confirmation"
  | "booking_cancellation"
  | "booking_reschedule";

/** Exponential-ish schedule for next_attempt_at relative to the
 *  most recent failure. Index = number of prior failures. */
const BACKOFF_MS = [
  60_000, // attempt 1 → 1 min
  5 * 60_000, // 2 → 5 min
  30 * 60_000, // 3 → 30 min
  2 * 60 * 60_000, // 4 → 2 h
  12 * 60 * 60_000, // 5 → 12 h
];
export const MAX_ATTEMPTS = BACKOFF_MS.length;

export function backoffDelayMs(prevAttempts: number): number {
  const idx = Math.min(Math.max(prevAttempts, 0), BACKOFF_MS.length - 1);
  return BACKOFF_MS[idx];
}

/** Serialize email-send args for JSONB storage. Date instances become
 *  ISO strings; everything else passes through. The cron dispatcher
 *  reverses this when calling the send function. */
export function serializeEmailArgs(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (v instanceof Date) out[k] = v.toISOString();
    else out[k] = v;
  }
  return out;
}

/** Reverse of serializeEmailArgs — turn ISO strings back into Date
 *  for the named fields that the send functions expect as Date.
 *  Used by the retry cron when dispatching. */
export function deserializeEmailArgs(
  payload: Record<string, unknown>,
  dateFields: string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...payload };
  for (const field of dateFields) {
    const v = out[field];
    if (typeof v === "string") out[field] = new Date(v);
  }
  return out;
}

/** Insert (or update an existing active row for the same dedupe key)
 *  representing a failed send. Caller passes the original send-args
 *  as `payload` so the cron can re-attempt with the same shape. */
export async function enqueueFailedEmail(args: {
  kind: FailedEmailKind;
  payload: Record<string, unknown>;
  dedupeKey: string;
  bookingId?: string | null;
  error: unknown;
  now?: () => number;
}): Promise<void> {
  const supabase = createAdminClient();
  const errMsg = args.error instanceof Error ? args.error.message : String(args.error);
  const now = args.now ? args.now() : Date.now();
  const nowIso = new Date(now).toISOString();
  const nextAttemptIso = new Date(now + backoffDelayMs(0)).toISOString();

  // Try update-then-insert (partial unique index on dedupe_key means
  // we can have AT MOST one active row per key). UPDATE first:
  const { data: updated } = await supabase
    .from("failed_emails")
    .update({
      attempts: 1, // will be set absolute by cron on next attempt
      last_error: errMsg,
      last_attempt_at: nowIso,
      next_attempt_at: nextAttemptIso,
      payload: args.payload as Json,
    })
    .eq("dedupe_key", args.dedupeKey)
    .is("succeeded_at", null)
    .is("given_up_at", null)
    .select("id")
    .maybeSingle();
  if (updated) return;

  // No active row — INSERT a new one. attempts=1 represents the
  // original (failed) try that put us here.
  const { error: insertErr } = await supabase.from("failed_emails").insert({
    kind: args.kind,
    payload: args.payload as Json,
    dedupe_key: args.dedupeKey,
    booking_id: args.bookingId ?? null,
    attempts: 1,
    last_error: errMsg,
    last_attempt_at: nowIso,
    next_attempt_at: nextAttemptIso,
  });
  if (insertErr) {
    // Either a concurrent insert raced us (re-queue is now a no-op),
    // or something more interesting — log either way so we don't lose
    // visibility silently.
    console.error("[email-queue] enqueue insert error:", insertErr);
  }
}

export interface FailedEmailRow {
  id: string;
  kind: FailedEmailKind;
  payload: Record<string, unknown>;
  dedupe_key: string;
  attempts: number;
  next_attempt_at: string;
  last_error: string | null;
  last_attempt_at: string;
  succeeded_at: string | null;
  given_up_at: string | null;
  booking_id: string | null;
  created_at: string;
}

/** Pull the next batch of queue rows the cron should retry now. */
export async function listPendingFailedEmails(limit = 20): Promise<FailedEmailRow[]> {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("failed_emails")
    .select("*")
    .is("succeeded_at", null)
    .is("given_up_at", null)
    .lte("next_attempt_at", nowIso)
    .order("next_attempt_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data as FailedEmailRow[] | null) ?? [];
}

/** Mark a row as successfully sent. The cron also updates the
 *  matching booking's *_email_sent flag separately. */
export async function markFailedEmailSucceeded(id: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("failed_emails")
    .update({
      succeeded_at: new Date().toISOString(),
      last_attempt_at: new Date().toISOString(),
    })
    .eq("id", id);
}

/** Record another failure: increments attempts + schedules next try,
 *  or sets `given_up_at` if we've hit the cap. */
export async function recordFailedEmailRetryOutcome(args: {
  id: string;
  priorAttempts: number;
  error: unknown;
}): Promise<void> {
  const supabase = createAdminClient();
  const errMsg = args.error instanceof Error ? args.error.message : String(args.error);
  const nextAttempts = args.priorAttempts + 1;
  const nowIso = new Date().toISOString();

  if (nextAttempts >= MAX_ATTEMPTS) {
    await supabase
      .from("failed_emails")
      .update({
        attempts: nextAttempts,
        last_error: errMsg,
        last_attempt_at: nowIso,
        given_up_at: nowIso,
      })
      .eq("id", args.id);
    return;
  }

  const nextAttemptIso = new Date(Date.now() + backoffDelayMs(nextAttempts)).toISOString();
  await supabase
    .from("failed_emails")
    .update({
      attempts: nextAttempts,
      last_error: errMsg,
      last_attempt_at: nowIso,
      next_attempt_at: nextAttemptIso,
    })
    .eq("id", args.id);
}
