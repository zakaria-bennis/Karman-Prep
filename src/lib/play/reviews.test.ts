import { describe, expect, it } from "vitest";
import { addDays, dueSkills, nextReview, outcomesOf, REVIEW_GAPS, withReviews } from "./reviews";

const T = "2026-11-22";

describe("nextReview", () => {
  it("grows the gap 1, 3, 7, 14, 30 days, reviewed on time", () => {
    let s = nextReview(undefined, "s", true, T);
    expect(s).toEqual({ skillId: "s", step: 0, dueOn: addDays(T, 1) });
    const seen: number[] = [1];
    for (let i = 0; i < 5; i++) {
      const day = s.dueOn;
      s = nextReview(s, "s", true, day);
      seen.push(Math.round((Date.parse(s.dueOn) - Date.parse(day)) / 86_400_000));
    }
    expect(seen).toEqual([1, 3, 7, 14, 30, 30]);
    expect(REVIEW_GAPS).toEqual([1, 3, 7, 14, 30]);
  });

  it("brings a miss back tomorrow, from any step", () => {
    const far = { skillId: "s", step: 4, dueOn: addDays(T, 20) };
    expect(nextReview(far, "s", false, T)).toEqual({ skillId: "s", step: 0, dueOn: addDays(T, 1) });
  });

  it("does not push a review out when the skill is practiced right before it is due", () => {
    const later = { skillId: "s", step: 2, dueOn: addDays(T, 4) };
    expect(nextReview(later, "s", true, T)).toBe(later);
  });
});

describe("outcomesOf and dueSkills", () => {
  it("counts a skill right only when every answer on it was", () => {
    const out = outcomesOf([
      { skillId: "a", ok: true },
      { skillId: "a", ok: false },
      { skillId: "b", ok: true },
      { skillId: "", ok: false },
    ]);
    expect([...out]).toEqual([
      ["a", false],
      ["b", true],
    ]);
  });

  it("takes the most overdue first, at most five", () => {
    const states = ["a", "b", "c", "d", "e", "f", "g"].map((skillId, i) => ({
      skillId,
      step: 0,
      dueOn: addDays(T, i - 5),
    }));
    expect(dueSkills(states, T)).toEqual(["a", "b", "c", "d", "e"]);
    expect(dueSkills(states, addDays(T, -5))).toEqual(["a"]);
  });
});

describe("withReviews", () => {
  const q = (questionId: string, section: string) => ({ questionId, section });
  it("puts each review in place of the last question of its own section", () => {
    const ten = [q("r1", "rw"), q("r2", "rw"), q("m1", "math"), q("m2", "math")];
    const out = withReviews(ten, [q("x", "math"), q("y", "rw")]);
    expect(out.map((p) => p.questionId)).toEqual(["r1", "y", "m1", "x"]);
  });

  it("never takes the place of another review, nor adds one twice", () => {
    const ten = [q("r1", "rw"), q("m1", "math")];
    const out = withReviews(ten, [q("x", "math"), q("y", "math"), q("x", "math"), q("z", "math")]);
    expect(out.map((p) => p.questionId)).toEqual(["y", "x"]);
  });
});
