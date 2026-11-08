import { describe, expect, it } from "vitest";
import { MARCH_PROGRAM } from "@/lib/marketing/offer";
import { cohortBillingAnchor } from "./cohort-installments";
import { cohortInstallmentSpecs } from "./prices";

describe("the cohort instalment plan", () => {
  it("adds up to the cohort price: the deposit and three payments", () => {
    const { deposit, installment } = cohortInstallmentSpecs();
    expect(deposit.amount + MARCH_PROGRAM.installments.count * installment.amount).toBe(
      MARCH_PROGRAM.price
    );
    expect(deposit.intervalMonths).toBeNull();
    expect(installment.intervalMonths).toBe(1);
  });

  it("starts the monthly payments on the cohort's start date, if it is still ahead", () => {
    const anchor = cohortBillingAnchor(new Date("2026-11-08T12:00:00Z"), "2027-01-04");
    expect(anchor).toBe(Date.parse("2027-01-04T12:00:00Z") / 1000);
    expect(cohortBillingAnchor(new Date("2027-01-03T12:00:00Z"), "2027-01-04")).toBeNull();
    expect(cohortBillingAnchor(new Date("2027-02-01T12:00:00Z"), "2027-01-04")).toBeNull();
  });
});
