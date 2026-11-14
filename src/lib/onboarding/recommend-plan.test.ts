import { describe, expect, it } from "vitest";
import {
  planSummary,
  recommendPlan,
  type Independence,
  type LearningPace,
  type PriorPrepResult,
  type RecommendationInput,
  type RecommendedPlanId,
} from "./recommend-plan";

const base: RecommendationInput = {
  weeksToTest: 30,
  goalScore: 1250,
  baselineScore: 1200,
  hoursPerWeek: 6,
  independence: "on_my_own",
  pace: "quick",
  priorPrep: "first_time",
};

const pick = (overrides: Partial<RecommendationInput>) =>
  recommendPlan({ ...base, ...overrides }).planId;

describe("recommendPlan", () => {
  it("sends an independent student with a modest goal to Practice", () => {
    expect(pick({})).toBe("practice");
  });

  it("moves an independent student to Pro for a goal of 1400 or higher", () => {
    expect(pick({ baselineScore: 1350, goalScore: 1450 })).toBe("pro");
  });

  it("moves an independent student to Pro for a large score gap", () => {
    expect(pick({ baselineScore: 1000, goalScore: 1250 })).toBe("pro");
    expect(pick({ baselineScore: null, goalScore: 1250 })).toBe("pro");
  });

  it("sends a student who needs structure to the Cohort", () => {
    expect(pick({ independence: "needs_structure" })).toBe("cohort");
    expect(pick({ independence: "with_checkins" })).toBe("cohort");
  });

  it("sends a student who needs high personal attention to Private 10", () => {
    // slower pace (2) + prep that didn't work (2) + a 130-point gap (2)
    expect(
      pick({ pace: "slower", priorPrep: "didnt_move", baselineScore: 1100, goalScore: 1230 })
    ).toBe("private-10");
  });

  it("uses Private 20 when the gap is large or time is short", () => {
    expect(
      pick({ pace: "slower", priorPrep: "didnt_move", baselineScore: 1000, goalScore: 1250 })
    ).toBe("private-20");
    expect(pick({ weeksToTest: 6, pace: "slower", baselineScore: 1150, goalScore: 1250 })).toBe(
      "private-20"
    );
  });

  it("tells a student already at 1500 that a program isn't worth it", () => {
    const r = recommendPlan({
      ...base,
      baselineScore: 1520,
      goalScore: 1580,
      independence: "needs_structure",
      pace: "slower",
      priorPrep: "didnt_move",
    });
    expect(r.planId).toBe("pro");
    expect(r.why).toContain("probably isn't the best use of your money");
  });

  it("keeps a student whose SAT is under four weeks away on a self-paced plan", () => {
    expect(
      pick({ weeksToTest: 3, independence: "needs_structure", pace: "slower", goalScore: 1300 })
    ).toBe("practice");
  });

  it("never names a retired plan, price or trial, and never uses an em dash", () => {
    const independences: Independence[] = ["on_my_own", "with_checkins", "needs_structure"];
    const paces: LearningPace[] = ["quick", "average", "slower"];
    const priors: PriorPrepResult[] = ["first_time", "worked", "didnt_move"];
    const seen = new Set<RecommendedPlanId>();
    for (const independence of independences)
      for (const pace of paces)
        for (const priorPrep of priors)
          for (const weeksToTest of [null, 3, 6, 10, 16, 30])
            for (const [baselineScore, goalScore] of [
              [null, 1300],
              [1200, 1250],
              [1100, 1250],
              [1000, 1400],
              [1520, 1580],
            ] as const) {
              const r = recommendPlan({
                weeksToTest,
                goalScore,
                baselineScore,
                hoursPerWeek: 2,
                independence,
                pace,
                priorPrep,
              });
              seen.add(r.planId);
              const text = JSON.stringify(r);
              expect(text).not.toMatch(/Seminar|Small Group|Elite|\$135|\$40\b|\$800|trial/i);
              expect(text).not.toContain("—");
              expect(r.alsoConsidered?.planId).not.toBe(r.planId);
            }
    expect([...seen].sort()).toEqual(["cohort", "practice", "private-10", "private-20", "pro"]);
  });
});

describe("planSummary", () => {
  it("shows each plan's real price and links to its next step", () => {
    expect(planSummary("practice")).toEqual({
      name: "Practice",
      price: "$39 a month, or $89 for 3 months",
      href: "/checkout/start?plan=practice&term=month",
      action: "Start Practice",
    });
    expect(planSummary("pro")).toMatchObject({
      price: "$69 a month, or $149 for 3 months",
      href: "/checkout/start?plan=pro&term=month",
    });
    expect(planSummary("cohort")).toMatchObject({
      name: "9-week Cohort",
      price: "$995",
      href: "/reserve",
    });
    expect(planSummary("private-10")).toMatchObject({
      name: "Private 10",
      price: "$1,495 for 10 hours",
      href: "/private-tutoring#call",
      action: "Book a free 20-minute call",
    });
    expect(planSummary("private-20")).toMatchObject({
      name: "Private 20",
      price: "$2,495 for 20 hours",
      href: "/private-tutoring#call",
    });
  });
});
