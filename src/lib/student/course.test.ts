import { describe, expect, it } from "vitest";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import { buildCourse, scoreGain, subjectFromSlug } from "./course";
import { mistakeLog, nextEndlessSkill } from "./endless";
import type { SkillLevel } from "./levels";
import { planFromSubscription, canUse, questionsLeft } from "./plan-gate";

describe("Library courses", () => {
  it("splits each course into its Domains with every skill", () => {
    const math = buildCourse("math", new Map());
    expect(math.name).toBe("SAT Math");
    expect(math.domains).toHaveLength(4);
    expect(math.total).toBe(CATALOG_SKILLS.filter((s) => s.subject === "math").length);
    expect(math.progress).toBe(0);
    expect(buildCourse("reading", new Map()).domains).toHaveLength(4);
  });

  it("puts the biggest score gain up next, and moves on as skills climb", () => {
    const empty = buildCourse("math", new Map());
    const first = empty.upNext!;
    expect(["algebra", "advanced_math"]).toContain(first.domainId);
    const levels = new Map<string, SkillLevel>([[first.id, 4]]);
    expect(buildCourse("math", levels).upNext!.id).not.toBe(first.id);
    expect(scoreGain("algebra", 4)).toBe(0);
  });

  it("reads course slugs", () => {
    expect(subjectFromSlug("math")).toBe("math");
    expect(subjectFromSlug("reading-writing")).toBe("reading");
    expect(subjectFromSlug("units")).toBeNull();
  });
});

describe("endless mode", () => {
  it("brings back a fresh miss first, then the course that is behind", () => {
    const now = Date.parse("2026-11-08T12:00:00Z");
    const skill = CATALOG_SKILLS.find((s) => s.subject === "reading")!.id;
    const log = mistakeLog([
      { skillId: skill, sessionId: "s1", correct: false, at: now - 86_400_000 },
      { skillId: skill, sessionId: "s1", correct: true, at: now - 86_000_000 },
    ]);
    expect(log).toHaveLength(1);
    expect(log[0].misses).toBe(1);
    const courses = [buildCourse("math", new Map()), buildCourse("reading", new Map())];
    expect(nextEndlessSkill(log, new Map(), courses, now)).toBe(skill);
    expect(nextEndlessSkill([], new Map(), courses, now)).toBe(courses[0].upNext!.id);
  });
});

describe("plan gates", () => {
  it("reads the plan from a subscription, Free without a live one", () => {
    expect(planFromSubscription(null).id).toBe("free");
    expect(planFromSubscription({ status: "canceled", plan_id: "pro" }).id).toBe("free");
    expect(planFromSubscription({ status: "active", plan_id: "pro" }).id).toBe("pro");
    expect(planFromSubscription({ status: "active", tier: "group" }).id).toBe("cohort");
    expect(planFromSubscription({ status: "trialing", tier: "private" }).id).toBe("private-10");
  });

  it("locks what the plan doesn't include", () => {
    const free = planFromSubscription(null);
    const practice = planFromSubscription({ status: "active", plan_id: "practice" });
    expect(canUse(free, "live:workshops")).toBe(false);
    expect(canUse(practice, "live:workshops")).toBe(true);
    expect(canUse(practice, "pool:mastery")).toBe(false);
    expect(
      canUse(free, "question:new", { questionsAnswered: 100, fullLengthTestsCompleted: 0 })
    ).toBe(false);
    expect(questionsLeft(free, { questionsAnswered: 40, fullLengthTestsCompleted: 0 })).toBe(60);
    expect(
      questionsLeft(practice, { questionsAnswered: 40, fullLengthTestsCompleted: 0 })
    ).toBeNull();
  });
});
