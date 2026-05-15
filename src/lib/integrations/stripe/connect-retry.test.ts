// ============================================================
// Tests for the give-up policy used by /api/webhooks/stripe-connect.
//
// Audit issue #14 — before the retry refactor the webhook always
// returned 200 even when processing threw, so Stripe never retried
// and the payout_requests row could be stuck "approved" forever.
// These tests pin the boundary: keep retrying while under the cap,
// give up exactly at the cap.
// ============================================================

import { describe, expect, it } from "vitest";
import { decideRetryOutcome, MAX_PROCESSING_ATTEMPTS } from "./connect-retry";

describe("decideRetryOutcome", () => {
  it("returns 200 + no give-up on success", () => {
    expect(decideRetryOutcome({ nextAttempts: 1, processingThrew: false })).toEqual({
      giveUp: false,
      responseStatus: 200,
    });
  });

  it("asks Stripe to retry (500) on the first failed attempt", () => {
    expect(decideRetryOutcome({ nextAttempts: 1, processingThrew: true })).toEqual({
      giveUp: false,
      responseStatus: 500,
    });
  });

  it("keeps retrying while attempts are below the cap", () => {
    for (let n = 1; n < MAX_PROCESSING_ATTEMPTS; n++) {
      expect(decideRetryOutcome({ nextAttempts: n, processingThrew: true })).toEqual({
        giveUp: false,
        responseStatus: 500,
      });
    }
  });

  it("gives up exactly at the cap and stops Stripe with a 200", () => {
    expect(
      decideRetryOutcome({ nextAttempts: MAX_PROCESSING_ATTEMPTS, processingThrew: true })
    ).toEqual({ giveUp: true, responseStatus: 200 });
  });

  it("stays in give-up state if attempts somehow exceed the cap", () => {
    expect(
      decideRetryOutcome({ nextAttempts: MAX_PROCESSING_ATTEMPTS + 3, processingThrew: true })
    ).toEqual({ giveUp: true, responseStatus: 200 });
  });
});
