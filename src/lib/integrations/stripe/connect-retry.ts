// ============================================================
// Stripe Connect webhook retry policy — pure helper extracted from
// /api/webhooks/stripe-connect/route.ts so the give-up decision is
// testable without mocking Supabase.
//
// On every delivery the route computes `nextAttempts = priorAttempts
// + 1` and asks `decideRetryOutcome` whether to give up or to
// signal Stripe for another retry. See the route file for the full
// dedup + reprocess flow.
// ============================================================

/** Stop retrying processing after this many attempts and route to
 *  admin triage. Stripe's own retry cap is ~72h with exponential
 *  backoff; this number is a ceiling on top of that in case Stripe
 *  over-delivers. */
export const MAX_PROCESSING_ATTEMPTS = 5;

export interface RetryDecision {
  /** True once we've burned the attempts budget — caller alerts
   *  admin, sets `gave_up_at`, and returns 200 so Stripe drops the
   *  event. */
  giveUp: boolean;
  /** HTTP status to return to Stripe. 500 keeps Stripe retrying;
   *  200 tells it to stop (either success or we gave up). */
  responseStatus: 200 | 500;
}

/** Decide what to do after a single processing attempt.
 *
 *  - On success → 200, never give up.
 *  - On failure with attempts < cap → 500 so Stripe retries.
 *  - On failure with attempts at/above cap → 200 + giveUp=true. */
export function decideRetryOutcome(args: {
  nextAttempts: number;
  processingThrew: boolean;
}): RetryDecision {
  if (!args.processingThrew) {
    return { giveUp: false, responseStatus: 200 };
  }
  if (args.nextAttempts >= MAX_PROCESSING_ATTEMPTS) {
    return { giveUp: true, responseStatus: 200 };
  }
  return { giveUp: false, responseStatus: 500 };
}
