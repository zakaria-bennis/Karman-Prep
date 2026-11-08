import { describe, expect, it } from "vitest";
import { MARCH_PROGRAM } from "@/lib/marketing/offer";
import { COHORT_TIER_CAP, tierLabel, tierLabelOf, type SchedulingTier } from "./tiers";

const TIERS: SchedulingTier[] = ["group", "small_group", "private", "elite"];

describe("tierLabel", () => {
  it("shows the plan ladder's names, never a retired plan", () => {
    expect(tierLabel("small_group")).toBe("Cohort");
    expect(tierLabel("group")).toBe("Weekly live session");
    expect(tierLabel("private")).toBe("Private tutoring");
    expect(tierLabel("elite")).toBe("Private tutoring");
    for (const tier of TIERS) {
      expect(tierLabel(tier)).not.toMatch(/Seminar|Small Group|Elite/);
    }
  });

  it("maps codes read as strings and leaves anything else alone", () => {
    expect(tierLabelOf("small_group")).toBe("Cohort");
    expect(tierLabelOf("pro")).toBe("pro");
    expect(tierLabelOf("constructor")).toBe("constructor");
  });
});

describe("COHORT_TIER_CAP", () => {
  it("seats a cohort at the offer's paid seats, six, as the database constraint does", () => {
    expect(COHORT_TIER_CAP.small_group).toBe(MARCH_PROGRAM.paidSeats);
    expect(COHORT_TIER_CAP.small_group).toBe(6);
  });
});
