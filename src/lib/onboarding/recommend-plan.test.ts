import { describe, expect, it } from "vitest";
import { planSummary, recommendPlan, type RecommendationInput } from "./recommend-plan";

const base: RecommendationInput = {
  weeksToTest: 30,
  goalScore: 1350,
  baselineScore: 1200,
  hoursPerWeek: 5,
  independence: "with_checkins",
  pace: "average",
  priorPrep: "first_time",
};
const pick = (overrides: Partial<RecommendationInput>) =>
  recommendPlan({ ...base, ...overrides }).planId;

describe("recommendPlan", () => {
  it("puts most students in the cohort", () => {
    expect(pick({})).toBe("cohort");
    expect(pick({ independence: "needs_structure" })).toBe("cohort");
    expect(pick({ baselineScore: null, goalScore: 1250 })).toBe("cohort");
    // studies alone, but 150 points or more is a class's work
    expect(pick({ independence: "on_my_own", pace: "quick" })).toBe("cohort");
    // studies alone, but needs questions walked through
    expect(pick({ independence: "on_my_own", pace: "slower", goalScore: 1300 })).toBe("cohort");
    // prep failed before, but learns fine from practice: still a class, not a tutor
    expect(pick({ priorPrep: "didnt_move" })).toBe("cohort");
  });

  it("gives the platform alone to a student who studies well alone with under 150 points to gain", () => {
    expect(pick({ independence: "on_my_own", goalScore: 1340 })).toBe("pro");
  });

  it("picks Pro before Practice: Practice only for a goal under 1300 and under 100 points", () => {
    const alone = { independence: "on_my_own" as const, pace: "quick" as const };
    expect(pick({ ...alone, baselineScore: 1200, goalScore: 1280 })).toBe("practice");
    expect(pick({ ...alone, baselineScore: 1200, goalScore: 1300 })).toBe("pro");
    expect(pick({ ...alone, baselineScore: 1150, goalScore: 1280 })).toBe("pro");
  });

  it("keeps private tutoring for when the cohort cannot get there", () => {
    // the SAT comes before a cohort could finish
    expect(pick({ weeksToTest: 6, goalScore: 1300 })).toBe("private-10");
    expect(pick({ weeksToTest: 6, baselineScore: 1100, goalScore: 1300 })).toBe("private-20");
    // 300 points or more
    expect(pick({ baselineScore: 1000, goalScore: 1300 })).toBe("private-20");
    // prep failed, needs walking through, 150 points or more
    expect(pick({ priorPrep: "didnt_move", pace: "slower" })).toBe("private-10");
  });

  it("does not sell tutoring for a near SAT with little to gain", () => {
    expect(pick({ weeksToTest: 6, baselineScore: 1300, goalScore: 1350 })).toBe("pro");
  });

  it("tells a student at 1500, or under four weeks out, that a program isn't worth it", () => {
    const high = recommendPlan({ ...base, baselineScore: 1520, goalScore: 1560 });
    expect(high.planId).toBe("pro");
    expect(high.why).toContain("isn't worth your money");
    expect(pick({ weeksToTest: 3 })).toBe("pro");
  });

  it("writes without dashes, and shows three answers at most", () => {
    for (const o of [
      {},
      { weeksToTest: 6 },
      { independence: "on_my_own" as const, goalScore: 1280 },
    ]) {
      const r = recommendPlan({ ...base, ...o });
      expect(
        `${r.headline} ${r.why} ${r.signals.join(" ")} ${r.alsoConsidered?.reason}`
      ).not.toMatch(/[—–]/);
      expect(r.signals.length).toBeLessThanOrEqual(3);
    }
  });
});

describe("planSummary", () => {
  it("sends each plan to its real next step", () => {
    expect(planSummary("pro").href).toBe("/checkout/start?plan=pro&term=month");
    expect(planSummary("cohort").href).toBe("/reserve");
    expect(planSummary("private-10").href).toBe("/call");
    expect(planSummary("private-20").action).toContain("call");
  });
});
