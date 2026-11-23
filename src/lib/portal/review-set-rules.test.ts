import { describe, expect, it } from "vitest";
import {
  dueOnFor,
  examSaturday,
  getsReviewSets,
  reviewSetSize,
  shareOut,
  skillsDueBy,
} from "./review-set-rules";

describe("who gets a curated review set", () => {
  it("is Cohort and Private students with a tutor only", () => {
    expect(getsReviewSets("cohort", true)).toBe(true);
    expect(getsReviewSets("private-10", true)).toBe(true);
    expect(getsReviewSets("private-20", true)).toBe(true);
    expect(getsReviewSets("cohort", false)).toBe(false);
    expect(getsReviewSets("pro", true)).toBe(false);
    expect(getsReviewSets("practice", true)).toBe(false);
    expect(getsReviewSets("free", false)).toBe(false);
  });
});

describe("the week", () => {
  it("is due the Friday before the next Saturday exam", () => {
    // 2026-11-22 is a Sunday
    expect(examSaturday("2026-11-22")).toBe("2026-11-28");
    expect(examSaturday("2026-11-27")).toBe("2026-11-28");
    // on a Saturday the exam has begun: next week's
    expect(examSaturday("2026-11-28")).toBe("2026-12-05");
    expect(dueOnFor("2026-11-28")).toBe("2026-11-27");
  });
});

describe("the size", () => {
  it("grows with what is due, from 8 to 20", () => {
    expect(reviewSetSize(1)).toBe(8);
    expect(reviewSetSize(4)).toBe(8);
    expect(reviewSetSize(6)).toBe(12);
    expect(reviewSetSize(10)).toBe(20);
    expect(reviewSetSize(30)).toBe(20);
  });

  it("takes the skills due by the exam, the most overdue first", () => {
    const due = skillsDueBy(
      [
        { skillId: "b", dueOn: "2026-11-25" },
        { skillId: "a", dueOn: "2026-11-20" },
        { skillId: "c", dueOn: "2026-12-10" },
      ],
      "2026-11-28"
    );
    expect(due).toEqual(["a", "b"]);
  });

  it("shares the questions out in turn", () => {
    const share = shareOut(["a", "b", "c"], 8);
    expect([...share.values()]).toEqual([3, 3, 2]);
    expect(shareOut([], 8).size).toBe(0);
  });
});
