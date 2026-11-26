import { describe, expect, it } from "vitest";
import { knownSatDates } from "./sat-dates-static";

describe("knownSatDates", () => {
  const dates = knownSatDates(["2027-03-13", "2027-10-02", "2027-08-28"], "2026-11-25");

  it("lists College Board's dates from today on, in order, each once", () => {
    expect(dates.slice(0, 9)).toEqual([
      "2026-12-05",
      "2027-03-06",
      "2027-05-01",
      "2027-06-05",
      "2027-08-28",
      "2027-09-18",
      "2027-10-09",
      "2027-11-06",
      "2027-12-04",
    ]);
  });

  it("leaves out the two dates that were once guessed a week off", () => {
    expect(dates).not.toContain("2027-03-13");
    expect(dates).not.toContain("2027-10-02");
  });
});
