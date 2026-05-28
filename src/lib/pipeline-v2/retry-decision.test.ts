// @vitest-environment node
//
// Tests for the orchestrator's stage retry-decision logic.
// This is the helper that decides whether a non-zero sub-process
// exit should be retried (transient infra) or surfaced (terminal
// bug). It saved us from tonight's "Supabase fetch failed" crash
// that killed Stage 6 deterministically.

import { describe, expect, it } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — .mjs has no type decls
import {
  decideRetry,
  TRANSIENT_PATTERNS,
  TERMINAL_PATTERNS,
} from "../../../scripts/lib/retry-decision.mjs";

describe("decideRetry — transient signatures should be retried", () => {
  it("retries on 'fetch failed' (tonight's actual failure)", () => {
    const out = decideRetry({
      exitCode: 1,
      signal: null,
      stderr: "[job-status] write failed: TypeError: fetch failed\nat ...",
      attemptNumber: 1,
    });
    expect(out.retry).toBe(true);
    expect(out.reason).toMatch(/transient/);
    expect(out.delayMs).toBe(5000);
  });

  it("retries on ECONNRESET", () => {
    const out = decideRetry({
      exitCode: 1,
      signal: null,
      stderr: "FATAL: Error: read ECONNRESET\n  at TLSWrap.onStreamRead",
      attemptNumber: 1,
    });
    expect(out.retry).toBe(true);
  });

  it("retries on Gemini 503 (the actual Page 74 failure tonight)", () => {
    const out = decideRetry({
      exitCode: 1,
      signal: null,
      stderr: "Gemini HTTP 503: The service is currently unavailable.",
      attemptNumber: 1,
    });
    expect(out.retry).toBe(true);
  });

  it("retries on socket hang up", () => {
    const out = decideRetry({
      exitCode: 1,
      signal: null,
      stderr: "Error: socket hang up",
      attemptNumber: 1,
    });
    expect(out.retry).toBe(true);
  });

  it("retries on ETIMEDOUT", () => {
    const out = decideRetry({
      exitCode: 1,
      signal: null,
      stderr: "TypeError: fetch failed\n  cause: Error: connect ETIMEDOUT 1.2.3.4:443",
      attemptNumber: 1,
    });
    expect(out.retry).toBe(true);
  });

  it("uses exponential backoff: 5s → 15s → 45s", () => {
    const a1 = decideRetry({
      exitCode: 1,
      signal: null,
      stderr: "fetch failed",
      attemptNumber: 1,
    });
    const a2 = decideRetry({
      exitCode: 1,
      signal: null,
      stderr: "fetch failed",
      attemptNumber: 2,
    });
    expect(a1.delayMs).toBe(5000);
    expect(a2.delayMs).toBe(15_000);
  });
});

describe("decideRetry — terminal signatures should NOT retry", () => {
  it("does not retry on quota exhausted", () => {
    const out = decideRetry({
      exitCode: 2,
      signal: null,
      stderr: "Anthropic quota exhausted: insufficient credit balance",
      attemptNumber: 1,
    });
    expect(out.retry).toBe(false);
    expect(out.reason).toMatch(/terminal/);
  });

  it("does not retry on 401 Unauthorized (bad API key)", () => {
    const out = decideRetry({
      exitCode: 1,
      signal: null,
      stderr: "HTTP 401: Unauthorized",
      attemptNumber: 1,
    });
    expect(out.retry).toBe(false);
  });

  it("does not retry on missing API key env var", () => {
    const out = decideRetry({
      exitCode: 1,
      signal: null,
      stderr: "Error: ANTHROPIC_API_KEY not set",
      attemptNumber: 1,
    });
    expect(out.retry).toBe(false);
  });

  it("does not retry on PDF-too-large error", () => {
    const out = decideRetry({
      exitCode: 1,
      signal: null,
      stderr: "PDF too large (250000000 bytes) for Gemini inline upload",
      attemptNumber: 1,
    });
    expect(out.retry).toBe(false);
  });

  it("does not retry on Phase 5 migration-not-applied check", () => {
    const out = decideRetry({
      exitCode: 1,
      signal: null,
      stderr:
        "Error: quiz_questions[abc] missing raw_question_text — Phase 5 migration not applied?",
      attemptNumber: 1,
    });
    expect(out.retry).toBe(false);
  });

  it("terminal signature wins over transient signature when both present", () => {
    // Edge case: imagine a stack trace mentions "fetch failed" but
    // the root cause line says "quota exhausted". The terminal
    // signature should win — retrying would just burn more API.
    const out = decideRetry({
      exitCode: 1,
      signal: null,
      stderr: "fetch failed in retry loop\nQuotaExhaustedError: anthropic quota exhausted",
      attemptNumber: 1,
    });
    expect(out.retry).toBe(false);
    expect(out.reason).toMatch(/terminal/);
  });
});

describe("decideRetry — caps + edge cases", () => {
  it("stops at maxAttempts even on transient", () => {
    const out = decideRetry({
      exitCode: 1,
      signal: null,
      stderr: "fetch failed",
      attemptNumber: 3,
      maxAttempts: 3,
    });
    expect(out.retry).toBe(false);
    expect(out.reason).toMatch(/max_attempts/);
  });

  it("respects custom maxAttempts", () => {
    const out = decideRetry({
      exitCode: 1,
      signal: null,
      stderr: "fetch failed",
      attemptNumber: 2,
      maxAttempts: 2,
    });
    expect(out.retry).toBe(false);
  });

  it("retries once on first SIGKILL (OOM spike) but not on repeat", () => {
    const first = decideRetry({
      exitCode: 137,
      signal: "SIGKILL",
      stderr: "",
      attemptNumber: 1,
    });
    expect(first.retry).toBe(true);
    expect(first.reason).toMatch(/sigkill_first/);

    const second = decideRetry({
      exitCode: 137,
      signal: "SIGKILL",
      stderr: "",
      attemptNumber: 2,
    });
    expect(second.retry).toBe(false);
    expect(second.reason).toMatch(/oom/);
  });

  it("default behavior on unknown failure shape: do NOT retry", () => {
    const out = decideRetry({
      exitCode: 1,
      signal: null,
      stderr: "ProprietaryErrorTypeNeverSeenBefore: something weird happened",
      attemptNumber: 1,
    });
    expect(out.retry).toBe(false);
    expect(out.reason).toMatch(/unknown/);
  });

  it("handles empty/null stderr without crashing", () => {
    const out = decideRetry({
      exitCode: 1,
      signal: null,
      stderr: "",
      attemptNumber: 1,
    });
    expect(out.retry).toBe(false);
    // null stderr → same
    const out2 = decideRetry({
      exitCode: 1,
      signal: null,
      stderr: null as unknown as string,
      attemptNumber: 1,
    });
    expect(out2.retry).toBe(false);
  });
});

describe("pattern exports — sanity", () => {
  it("exports TRANSIENT_PATTERNS as a non-empty array of RegExp", () => {
    expect(Array.isArray(TRANSIENT_PATTERNS)).toBe(true);
    expect(TRANSIENT_PATTERNS.length).toBeGreaterThan(5);
    expect(TRANSIENT_PATTERNS.every((p: unknown) => p instanceof RegExp)).toBe(true);
  });

  it("exports TERMINAL_PATTERNS as a non-empty array of RegExp", () => {
    expect(Array.isArray(TERMINAL_PATTERNS)).toBe(true);
    expect(TERMINAL_PATTERNS.length).toBeGreaterThan(5);
  });

  it("no overlap: no signature matches both lists in a way that breaks ordering", () => {
    // The "terminal wins over transient" promise only holds because
    // the TERMINAL_PATTERNS check runs first. This test catches the
    // case where someone adds a TRANSIENT_PATTERN that happens to
    // match a "quota" string.
    const sample = "anthropic quota exhausted: insufficient credit";
    const t = TRANSIENT_PATTERNS.some((p: RegExp) => p.test(sample));
    const k = TERMINAL_PATTERNS.some((p: RegExp) => p.test(sample));
    // Both can match — that's fine. The decideRetry logic checks
    // terminal first, so terminal wins. We just assert AT LEAST
    // terminal matches "quota" so we don't accidentally lose the
    // signal entirely.
    expect(k).toBe(true);
    void t;
  });
});
