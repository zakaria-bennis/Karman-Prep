import { describe, expect, it } from "vitest";
import { SUB_SKILLS } from "@/lib/subskills/taxonomy";
import { buildCourse, scoreGain, subjectFromSlug } from "./course";
import type { SkillLevel } from "./levels";
import { canUse, questionsLeft, showsCalendar, studentPlan } from "./plan-gate";

describe("Library courses", () => {
  it("splits each course into its Domains, official skills and every sub-skill", () => {
    const math = buildCourse("math", new Map());
    expect(math.name).toBe("SAT Math");
    expect(math.domains).toHaveLength(4);
    expect(math.total).toBe(SUB_SKILLS.filter((s) => s.subject === "math").length);
    const algebra = math.domains.find((d) => d.id === "algebra")!;
    expect(algebra.officials.map((o) => o.label)).toHaveLength(5);
    const sec = buildCourse("reading", new Map()).domains.find((d) => d.id === "conventions")!;
    expect(sec.officials.map((o) => o.label)).toEqual(["Boundaries", "Form, Structure, and Sense"]);
    expect(sec.skills).toHaveLength(12);
    expect(math.progress).toBe(0);
    expect(buildCourse("reading", new Map()).domains).toHaveLength(4);
  });

  it("puts the biggest score gain up next, and moves on as skills climb", () => {
    const empty = buildCourse("math", new Map());
    const first = empty.upNext!;
    expect(["algebra", "advanced_math"]).toContain(first.domainId);
    const levels = new Map<string, SkillLevel>([[first.id, 4]]);
    expect(buildCourse("math", levels).upNext!.id).not.toBe(first.id);
    expect(scoreGain("algebra", 0.5, 4)).toBe(0);
    // A sub-skill the bank asks more often weighs more.
    const heavy = buildCourse("math", new Map(), (id) => (id === first.id ? 1 : 100));
    expect(heavy.upNext!.id).not.toBe(first.id);
  });

  it("reads course slugs", () => {
    expect(subjectFromSlug("math")).toBe("math");
    expect(subjectFromSlug("reading-writing")).toBe("reading");
    expect(subjectFromSlug("units")).toBeNull();
  });
});

describe("plan gates", () => {
  it("names the plan and shows Calendar only when something can be booked", () => {
    expect(studentPlan("cohort").name).toBe("9-week Cohort");
    expect(showsCalendar(studentPlan("free"))).toBe(false);
    expect(showsCalendar(studentPlan("practice"))).toBe(true);
    expect(canUse(studentPlan("private-10"), "live:private")).toBe(true);
    expect(canUse(studentPlan("cohort"), "live:private")).toBe(false);
  });

  it("locks what the plan doesn't include", () => {
    const free = studentPlan("free");
    const practice = studentPlan("practice");
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
