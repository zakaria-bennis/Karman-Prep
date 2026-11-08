import { describe, expect, it } from "vitest";
import { rankDailySkills, selectDailyQuestionId, utcDayKey } from "./selection";

const skills = [
  { id: "ma-a", subject: "math" as const },
  { id: "ma-b", subject: "math" as const },
  { id: "ma-c", subject: "math" as const },
  { id: "rw-a", subject: "reading" as const },
];
const ids = Array.from({ length: 50 }, (_, index) => `q-${index}`);

describe("daily challenge selection", () => {
  it("uses one UTC day across time zones", () => {
    expect(utcDayKey(new Date("2026-10-08T23:59:59-04:00"))).toBe("2026-10-09");
  });

  it("orders only the subject's skills, stably, and rotates them by day", () => {
    const today = rankDailySkills(skills, "math", "2026-11-08");
    expect([...today].sort()).toEqual(["ma-a", "ma-b", "ma-c"]);
    expect(rankDailySkills([...skills].reverse(), "math", "2026-11-08")).toEqual(today);
    expect(rankDailySkills(skills, "reading", "2026-11-08")).toEqual(["rw-a"]);
    const firsts = new Set(
      Array.from(
        { length: 30 },
        (_, day) =>
          rankDailySkills(skills, "math", `2026-11-${String(day + 1).padStart(2, "0")}`)[0]
      )
    );
    expect(firsts.size).toBe(3);
  });

  it("picks one question independent of row order and rotates it daily", () => {
    const day = "2026-11-08";
    const choice = selectDailyQuestionId(ids, "math", day);
    expect(ids).toContain(choice);
    expect(selectDailyQuestionId([...ids].reverse(), "math", day)).toBe(choice);
    expect(selectDailyQuestionId([], "math", day)).toBeNull();
    const days = new Set(
      Array.from({ length: 30 }, (_, d) =>
        selectDailyQuestionId(ids, "math", `2026-11-${String(d + 1).padStart(2, "0")}`)
      )
    );
    expect(days.size).toBeGreaterThan(15);
  });

  it("rejects invalid days", () => {
    expect(() => selectDailyQuestionId(ids, "math", "today")).toThrow("Invalid");
    expect(() => rankDailySkills(skills, "math", "today")).toThrow("Invalid");
  });
});
