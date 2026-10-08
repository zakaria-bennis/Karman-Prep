import { describe, expect, it } from "vitest";
import { selectDailyCandidate, utcDayKey, type DailyCandidate } from "./selection";

const digest = "a".repeat(64);
const candidates: DailyCandidate[] = [
  { subject: "math", questionId: "b", skillId: "math-skill", payloadSha256: digest },
  { subject: "math", questionId: "a", skillId: "math-skill", payloadSha256: digest },
  { subject: "reading", questionId: "c", skillId: "reading-skill", payloadSha256: digest },
];

describe("daily challenge selection", () => {
  it("uses one UTC day across time zones", () => {
    expect(utcDayKey(new Date("2026-10-08T23:59:59-04:00"))).toBe("2026-10-09");
  });

  it("is stable across input ordering and never crosses subjects", () => {
    const day = "2026-10-08";
    expect(selectDailyCandidate(candidates, "math", day)).toEqual(
      selectDailyCandidate([...candidates].reverse(), "math", day)
    );
    expect(selectDailyCandidate(candidates, "reading", day)?.questionId).toBe("c");
    expect(selectDailyCandidate([], "math", day)).toBeNull();
  });

  it("rejects ambiguous identities and invalid days", () => {
    expect(() =>
      selectDailyCandidate([...candidates, candidates[0]], "math", "2026-10-08")
    ).toThrow("ambiguous");
    expect(() => selectDailyCandidate(candidates, "math", "today")).toThrow("Invalid");
  });
});
