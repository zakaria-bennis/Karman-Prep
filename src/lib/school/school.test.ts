import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createAdminClient: () => ({}) }));

const { completionFor, homeworkHref, homeworkTitle } = await import("./homework");
const {
  JOIN_CODE_PATTERN,
  makeJoinCode,
  normalizeJoinCode,
  planStatusLine,
  trialEndFor,
  yearlyCost,
} = await import("./terms");

describe("school terms", () => {
  it("states the plan the founder set", () => {
    expect(planStatusLine("2027-08-31")).toBe(
      "Free until August 31, 2027, then $8 per student a year"
    );
    expect(yearlyCost(120)).toBe(960);
    expect(yearlyCost(-3)).toBe(0);
  });

  it("makes six-character codes without look-alikes", () => {
    for (let i = 0; i < 200; i += 1) expect(makeJoinCode()).toMatch(JOIN_CODE_PATTERN);
    expect(makeJoinCode(() => new Uint8Array([0, 1, 2, 3, 4, 31]))).toBe("ABCDE9");
    expect(normalizeJoinCode(" lkv-3pq ")).toBe("LKV3PQ");
    expect(JOIN_CODE_PATTERN.test("LKV0PQ")).toBe(false);
  });
});

describe("school homework", () => {
  const assignment = {
    id: "a1",
    class_id: "c1",
    kind: "skill_practice" as const,
    target_id: "ma-skill-percentages",
    title: "Practice: Percentages",
    due_on: "2026-11-11",
    created_at: "2026-11-08T10:00:00Z",
  };

  it("titles each kind of work from the catalog", () => {
    expect(homeworkTitle("skill_practice", "ma-skill-percentages")).toBe("Practice: Percentages");
    expect(homeworkTitle("domain_quiz", "algebra")).toBe("Domain quiz: Algebra");
    expect(homeworkTitle("full_length_test", null)).toBe("Full-length practice test");
    expect(homeworkTitle("skill_practice", "nope")).toBeNull();
    expect(homeworkTitle("full_length_test", "algebra")).toBeNull();
    expect(homeworkHref("skill_practice", "ma-skill-percentages")).toBe(
      "/learn/set/ma-skill-percentages"
    );
    expect(homeworkHref("domain_quiz", "algebra")).toBe("/learn/domain/algebra");
    expect(homeworkHref("full_length_test", null)).toBe("/learn/tests");
  });

  it("counts a practice set on the skill finished after the assignment", () => {
    expect(completionFor(assignment, [])).toBeNull();
    expect(
      completionFor(assignment, [
        { skill_id: "ma-skill-percentages", completed_at: "2026-11-07T10:00:00Z" },
      ])
    ).toBeNull();
    expect(
      completionFor(assignment, [
        { skill_id: "ma-skill-linear-functions", completed_at: "2026-11-09T10:00:00Z" },
        { skill_id: "ma-skill-percentages", completed_at: "2026-11-09T11:00:00Z" },
      ])
    ).toBe("2026-11-09T11:00:00Z");
    expect(
      completionFor({ ...assignment, kind: "domain_quiz", target_id: "algebra" }, [])
    ).toBeNull();
  });

  it("counts a finished Domain quiz on that Domain, never a practice set with the same id", () => {
    const quiz = { ...assignment, kind: "domain_quiz" as const, target_id: "algebra" };
    expect(
      completionFor(quiz, [{ skill_id: "algebra", completed_at: "2026-11-09T10:00:00Z" }])
    ).toBeNull();
    expect(
      completionFor(quiz, [
        { skill_id: "algebra", completed_at: "2026-11-09T10:00:00Z", kind: "domain_quiz" },
      ])
    ).toBe("2026-11-09T10:00:00Z");
  });
});

describe("renewal trial end", () => {
  it("waits for the free year to end, or bills now when it is close", () => {
    const now = new Date("2026-11-08T12:00:00Z");
    expect(trialEndFor("2027-08-31", now)).toBe(Date.parse("2027-08-31T00:00:00Z") / 1000);
    expect(trialEndFor("2026-11-09", now)).toBeUndefined();
  });
});
