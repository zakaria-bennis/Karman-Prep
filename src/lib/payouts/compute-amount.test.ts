// ============================================================
// Unit tests for the payout calculator.
//
// The 15-min rounding rule has caused real bugs in the past
// (per-seat pay miscount), so each documented edge case has
// its own assertion. Add a new case here when you discover
// or change behavior.
// ============================================================

import { describe, expect, it } from "vitest";
import { computePayout, computePayoutAmount } from "./compute-amount";

describe("computePayoutAmount — 15-min increment rule", () => {
  it("pays 1 hour at the default $35 rate", () => {
    expect(computePayoutAmount(60, null)).toBe(35);
  });

  it("rounds 65 min DOWN to 60 — overage under 15 min doesn't pay", () => {
    expect(computePayoutAmount(65, null)).toBe(35);
  });

  it("pays 75 min as 1.25 hours", () => {
    expect(computePayoutAmount(75, null)).toBe(43.75);
  });

  it("rounds 89 min DOWN to 75 (still 1.25h bucket)", () => {
    expect(computePayoutAmount(89, null)).toBe(43.75);
  });

  it("pays 90 min as 1.5 hours", () => {
    expect(computePayoutAmount(90, null)).toBe(52.5);
  });

  it("pays 120 min as 2 hours", () => {
    expect(computePayoutAmount(120, null)).toBe(70);
  });

  it("respects per-tutor hourly_rate override", () => {
    expect(computePayoutAmount(60, 50)).toBe(50);
    expect(computePayoutAmount(90, 50)).toBe(75);
  });

  it("treats null/undefined duration as 0 — no negative pay", () => {
    expect(computePayoutAmount(null, null)).toBe(0);
    expect(computePayoutAmount(undefined, null)).toBe(0);
  });

  it("handles short sessions pro-rata (no minimum)", () => {
    expect(computePayoutAmount(45, null)).toBe(26.25);
    expect(computePayoutAmount(30, null)).toBe(17.5);
    expect(computePayoutAmount(15, null)).toBe(8.75);
  });

  it("rounds session below 15 min DOWN to zero", () => {
    expect(computePayoutAmount(14, null)).toBe(0);
    expect(computePayoutAmount(1, null)).toBe(0);
  });
});

describe("computePayout — full breakdown", () => {
  it("returns rawMinutes, paidMinutes, paidHours, hourlyRate, payoutAmount", () => {
    const breakdown = computePayout(75, 35);
    expect(breakdown).toEqual({
      rawMinutes: 75,
      paidMinutes: 75,
      paidHours: 1.25,
      hourlyRate: 35,
      payoutAmount: 43.75,
    });
  });

  it("captures the discarded overage in raw vs paid minutes", () => {
    const breakdown = computePayout(89, 35);
    expect(breakdown.rawMinutes).toBe(89);
    expect(breakdown.paidMinutes).toBe(75); // 14 min discarded
    expect(breakdown.payoutAmount).toBe(43.75);
  });
});
