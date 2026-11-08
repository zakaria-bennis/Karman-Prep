import { describe, expect, it } from "vitest";
import {
  FREE_PLAN,
  PLAN_IDS,
  PRACTICE_PLAN,
  PRO_PLAN,
  TUTOR_AFFILIATE_PLAN,
  type PlanId,
} from "@/lib/marketing/offer";
import {
  canAccess,
  canSeeQuestion,
  difficultyRangeFor,
  explanationTypes,
  poolFor,
  questionsLeft,
  type PlanUsage,
} from "./access";
import {
  PLAN_ENTITLEMENTS,
  mergeEntitlements,
  mostGenerous,
  planRank,
  type PlanEntitlements,
} from "./catalog";

const plan = (id: PlanId) => ({ entitlements: PLAN_ENTITLEMENTS[id] });
const usage = (questionsAnswered: number, fullLengthTestsCompleted = 0): PlanUsage => ({
  questionsAnswered,
  fullLengthTestsCompleted,
});

const PRO_LEVEL = {
  pool: "mastery",
  explanations: ["written", "video"],
  questionLimit: null,
  fullLengthTestLimit: null,
  tutorAdmin: false,
} satisfies PlanEntitlements;
const PRACTICE_LEVEL = {
  pool: "core",
  explanations: ["written"],
  questionLimit: null,
  fullLengthTestLimit: null,
  tutorAdmin: false,
} satisfies PlanEntitlements;

describe("plan catalog", () => {
  it.each<[PlanId, PlanEntitlements]>([
    [
      "free",
      {
        pool: "core",
        explanations: ["written"],
        questionLimit: 100,
        fullLengthTestLimit: 1,
        tutorAdmin: false,
      },
    ],
    ["practice", PRACTICE_LEVEL],
    ["pro", PRO_LEVEL],
    ["cohort", PRO_LEVEL],
    ["private-10", PRO_LEVEL],
    ["private-20", PRO_LEVEL],
    ["school", PRACTICE_LEVEL],
    ["tutor-affiliate", { ...PRO_LEVEL, tutorAdmin: true, maxSponsoredStudents: 50 }],
  ])("%s opens the right pool, explanations and limits", (id, expected) => {
    expect(PLAN_ENTITLEMENTS[id]).toEqual(expected);
  });

  it("covers every plan id in offer.ts", () => {
    expect(Object.keys(PLAN_ENTITLEMENTS).sort()).toEqual([...PLAN_IDS].sort());
  });

  it("reads its numbers from offer.ts", () => {
    expect(PLAN_ENTITLEMENTS.free.questionLimit).toBe(FREE_PLAN.questionLimit);
    expect(PLAN_ENTITLEMENTS.free.fullLengthTestLimit).toBe(FREE_PLAN.fullLengthTests);
    expect(PLAN_ENTITLEMENTS.practice.pool).toBe(PRACTICE_PLAN.pool);
    expect(PLAN_ENTITLEMENTS.pro.pool).toBe(PRO_PLAN.pool);
    expect(PLAN_ENTITLEMENTS["tutor-affiliate"].maxSponsoredStudents).toBe(
      TUTOR_AFFILIATE_PLAN.maxStudents
    );
  });

  it("ranks free below practice and school, below every pro-level plan", () => {
    expect(planRank("free")).toBeLessThan(planRank("practice"));
    expect(planRank("practice")).toBe(planRank("school"));
    for (const id of ["pro", "cohort", "private-10", "private-20", "tutor-affiliate"] as const) {
      expect(planRank(id)).toBeGreaterThan(planRank("practice"));
    }
  });

  it("picks the most generous plan", () => {
    expect(mostGenerous([])).toBe("free");
    expect(mostGenerous(["practice", "pro"])).toBe("pro");
    expect(mostGenerous(["school", "free"])).toBe("school");
    expect(mostGenerous(["pro", "tutor-affiliate"])).toBe("tutor-affiliate");
    expect(mostGenerous(["practice", "cohort", "school"])).toBe("cohort");
  });

  it("merges plans into the union of their access", () => {
    expect(mergeEntitlements([])).toEqual(PLAN_ENTITLEMENTS.free);
    expect(mergeEntitlements(["practice"])).toEqual(PRACTICE_LEVEL);
    expect(mergeEntitlements(["practice", "tutor-affiliate"])).toEqual(
      PLAN_ENTITLEMENTS["tutor-affiliate"]
    );
  });
});

describe("poolFor", () => {
  it.each([1, 2, 3, 4, 5])("difficulty %i is core", (level) => {
    expect(poolFor(level)).toBe("core");
  });

  it.each([6, 7])("difficulty %i is mastery", (level) => {
    expect(poolFor(level)).toBe("mastery");
  });

  it("reads numeric strings and legacy labels", () => {
    expect(poolFor("6")).toBe("mastery");
    expect(poolFor(" 3 ")).toBe("core");
    expect(poolFor("mastery")).toBe("mastery");
    expect(poolFor("advanced")).toBe("core");
    expect(poolFor("foundational")).toBe("core");
  });

  it.each([0, 8, 5.5, -1, Number.NaN, null, undefined, "hard", "", {}])(
    "treats an unreadable difficulty (%s) as mastery",
    (value) => {
      expect(poolFor(value)).toBe("mastery");
    }
  );
});

describe("canAccess", () => {
  it("lets a free user start question 100 but not question 101", () => {
    expect(canAccess(plan("free"), "question:new", usage(99))).toBe(true);
    expect(canAccess(plan("free"), "question:new", usage(100))).toBe(false);
  });

  it("gives a free user one full-length test", () => {
    expect(canAccess(plan("free"), "full-length-test:new", usage(0, 0))).toBe(true);
    expect(canAccess(plan("free"), "full-length-test:new", usage(0, 1))).toBe(false);
  });

  it("refuses limited features when usage is missing", () => {
    expect(canAccess(plan("free"), "question:new")).toBe(false);
    expect(canAccess(plan("free"), "full-length-test:new")).toBe(false);
  });

  it("has no limits on paid plans, even without usage", () => {
    for (const id of PLAN_IDS.filter((planId) => planId !== "free")) {
      expect(canAccess(plan(id), "question:new")).toBe(true);
      expect(canAccess(plan(id), "full-length-test:new", usage(5000, 40))).toBe(true);
    }
  });

  it("opens the mastery pool and video explanations at pro level only", () => {
    for (const id of PLAN_IDS) {
      const proLevel = planRank(id) === 2;
      expect(canAccess(plan(id), "pool:core")).toBe(true);
      expect(canAccess(plan(id), "explanations:written")).toBe(true);
      expect(canAccess(plan(id), "pool:mastery")).toBe(proLevel);
      expect(canAccess(plan(id), "explanations:video")).toBe(proLevel);
    }
  });

  it("gives tutor-admin rights to the tutor-affiliate plan only", () => {
    for (const id of PLAN_IDS) {
      expect(canAccess(plan(id), "tutor-admin")).toBe(id === "tutor-affiliate");
    }
  });
});

describe("canSeeQuestion", () => {
  it("applies the free limit to new questions only", () => {
    expect(canSeeQuestion(plan("free"), 3, usage(99))).toBe(true);
    expect(canSeeQuestion(plan("free"), 3, usage(100))).toBe(false);
    expect(canSeeQuestion(plan("free"), 3, usage(100), { alreadyAnswered: true })).toBe(true);
  });

  it("keeps the mastery pool closed below pro level", () => {
    expect(canSeeQuestion(plan("free"), 6, usage(0))).toBe(false);
    expect(canSeeQuestion(plan("practice"), 6)).toBe(false);
    expect(canSeeQuestion(plan("school"), 7, undefined, { alreadyAnswered: true })).toBe(false);
    expect(canSeeQuestion(plan("practice"), 5)).toBe(true);
  });

  it("opens every question at pro level", () => {
    for (const id of ["pro", "cohort", "private-10", "private-20", "tutor-affiliate"] as const) {
      expect(canSeeQuestion(plan(id), 7)).toBe(true);
      expect(canSeeQuestion(plan(id), "mastery")).toBe(true);
    }
  });
});

describe("explanations, ranges and counts", () => {
  it("lists explanation types in display order", () => {
    expect(explanationTypes(plan("practice"))).toEqual(["written"]);
    expect(explanationTypes(plan("cohort"))).toEqual(["written", "video"]);
  });

  it("returns a copy, so callers cannot change the catalog", () => {
    explanationTypes(plan("practice")).push("video");
    expect(PLAN_ENTITLEMENTS.practice.explanations).toEqual(["written"]);
  });

  it("gives the difficulty range to query", () => {
    expect(difficultyRangeFor(plan("free"))).toEqual({
      minimumDifficulty: 1,
      maximumDifficulty: 5,
    });
    expect(difficultyRangeFor(plan("pro"))).toEqual({ minimumDifficulty: 1, maximumDifficulty: 7 });
  });

  it("counts the questions a free user has left", () => {
    expect(questionsLeft(plan("free"), usage(37))).toBe(63);
    expect(questionsLeft(plan("free"), usage(120))).toBe(0);
    expect(questionsLeft(plan("practice"), usage(120))).toBeNull();
  });
});
