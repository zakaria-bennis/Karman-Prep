import { describe, expect, it } from "vitest";
import { isFreeTrialEligibleTier } from "./checkout-policy";

describe("isFreeTrialEligibleTier", () => {
  it("allows the seven-day trial for the bottom tier only", () => {
    expect(isFreeTrialEligibleTier("group")).toBe(true);
  });

  it.each(["small_group", "private", "elite", "annual", "unknown"])(
    "does not add a trial to %s",
    (tier) => {
      expect(isFreeTrialEligibleTier(tier)).toBe(false);
    }
  );
});
