import { describe, expect, it } from "vitest";
import { describeTest, formatTestDate, isIsoDay, testDateProblem } from "./test-dates";

const TODAY = "2026-11-08";
const SAT = ["2026-12-05", "2027-03-13"];

describe("test dates", () => {
  it("reads calendar days without a time zone shift", () => {
    expect(formatTestDate("2027-03-13")).toBe("Sat, Mar 13, 2027");
    expect(isIsoDay("2027-02-30")).toBe(false);
    expect(isIsoDay("2027-02-28")).toBe(true);
  });

  it("describes the saved state", () => {
    expect(describeTest(null, null)).toBe("Not set yet");
    expect(describeTest("sat", "2027-03-13")).toBe("SAT on Sat, Mar 13, 2027");
    expect(describeTest("psat", null)).toBe("PSAT, not registered yet");
    expect(describeTest(null, "2027-03-13")).toBe("SAT on Sat, Mar 13, 2027");
  });

  it("accepts only upcoming SAT dates from the list", () => {
    expect(testDateProblem("sat", "2026-12-05", TODAY, SAT)).toBeNull();
    expect(testDateProblem("sat", "2026-12-12", TODAY, SAT)).toMatch(/SAT dates/);
    expect(testDateProblem("sat", "2026-11-07", TODAY, SAT)).toMatch(/passed/);
    expect(testDateProblem("sat", null, TODAY, SAT)).toBeNull();
  });

  it("accepts a PSAT date from today to two years out", () => {
    expect(testDateProblem("psat", TODAY, TODAY, SAT)).toBeNull();
    expect(testDateProblem("psat", "2027-10-14", TODAY, SAT)).toBeNull();
    expect(testDateProblem("psat", "2029-01-01", TODAY, SAT)).toMatch(/two years/);
    expect(testDateProblem("psat", "nope", TODAY, SAT)).toBe("Pick a date.");
  });
});
