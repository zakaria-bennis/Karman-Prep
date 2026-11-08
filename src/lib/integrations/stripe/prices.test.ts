import { describe, expect, it } from "vitest";
import {
  MARCH_PROGRAM,
  PRACTICE_PLAN,
  PRIVATE_PACKAGES,
  PRO_PLAN,
  TUTOR_AFFILIATE_PLAN,
} from "@/lib/marketing/offer";
import { STRIPE_PRICES, findStripePrice, monthlyValue, priceLabel } from "./prices";

describe("STRIPE_PRICES", () => {
  it("matches the founder's plan table (2026-11-08)", () => {
    expect(
      STRIPE_PRICES.map((p) => [p.lookupKey, p.planId, p.term, p.amount, p.intervalMonths])
    ).toEqual([
      ["practice_monthly", "practice", "month", 39, 1],
      ["practice_3_months", "practice", "quarter", 89, 3],
      ["pro_monthly", "pro", "month", 69, 1],
      ["pro_3_months", "pro", "quarter", 149, 3],
      ["cohort", "cohort", "once", 995, null],
      ["private_10", "private-10", "once", 1495, null],
      ["private_20", "private-20", "once", 2495, null],
      ["tutor_affiliate_monthly", "tutor-affiliate", "month", 199, 1],
    ]);
  });

  it("reads every amount from offer.ts", () => {
    const amount = (key: string) => STRIPE_PRICES.find((p) => p.lookupKey === key)?.amount;
    expect(amount("practice_monthly")).toBe(PRACTICE_PLAN.monthly);
    expect(amount("practice_3_months")).toBe(PRACTICE_PLAN.threeMonths);
    expect(amount("pro_monthly")).toBe(PRO_PLAN.monthly);
    expect(amount("pro_3_months")).toBe(PRO_PLAN.threeMonths);
    expect(amount("cohort")).toBe(MARCH_PROGRAM.price);
    expect(amount("private_10")).toBe(PRIVATE_PACKAGES.find((p) => p.id === "private-10")?.price);
    expect(amount("private_20")).toBe(PRIVATE_PACKAGES.find((p) => p.id === "private-20")?.price);
    expect(amount("tutor_affiliate_monthly")).toBe(TUTOR_AFFILIATE_PLAN.monthly);
  });

  it("has unique lookup keys", () => {
    const keys = STRIPE_PRICES.map((p) => p.lookupKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("findStripePrice", () => {
  it("picks the term for Practice and Pro", () => {
    expect(findStripePrice("practice", "month")?.lookupKey).toBe("practice_monthly");
    expect(findStripePrice("practice", "quarter")?.lookupKey).toBe("practice_3_months");
    expect(findStripePrice("pro", "quarter")?.lookupKey).toBe("pro_3_months");
  });

  it("needs a term for Practice and Pro", () => {
    expect(findStripePrice("practice")).toBeNull();
    expect(findStripePrice("pro", null)).toBeNull();
  });

  it("ignores the term for plans with one price", () => {
    expect(findStripePrice("cohort", "quarter")?.lookupKey).toBe("cohort");
    expect(findStripePrice("tutor-affiliate", "quarter")?.lookupKey).toBe(
      "tutor_affiliate_monthly"
    );
    expect(findStripePrice("private-20")?.lookupKey).toBe("private_20");
  });

  it.each(["free", "school", "group", "elite"])("sells nothing for %s", (planId) => {
    expect(findStripePrice(planId, "month")).toBeNull();
  });
});

describe("labels", () => {
  it("says how often a family pays", () => {
    expect(priceLabel({ amount: 39, intervalMonths: 1 })).toBe("$39 a month");
    expect(priceLabel({ amount: 89, intervalMonths: 3 })).toBe("$89 every 3 months");
    expect(priceLabel({ amount: 1495, intervalMonths: null })).toBe("$1,495");
  });

  it("counts a 3-month price as a third per month", () => {
    expect(monthlyValue({ amount: 149, intervalMonths: 3 })).toBeCloseTo(49.67, 2);
    expect(monthlyValue({ amount: 995, intervalMonths: null })).toBe(0);
  });
});
