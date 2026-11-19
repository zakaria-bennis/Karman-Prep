import { describe, expect, it } from "vitest";
import { clockOf, minutesFor, shownLevel, shownLevelName } from "./shown-level";

describe("what a student is shown", () => {
  it("shows three earned levels, with the engine's New as Not started", () => {
    expect([0, 1, 2, 3, 4].map(shownLevel)).toEqual([0, 0, 1, 2, 3]);
    expect(shownLevelName(1)).toBe("Not started");
    expect(shownLevelName(4)).toBe("Proficient");
  });

  it("writes a sitting's length, and nothing for a set left open for days", () => {
    expect(clockOf(372_000)).toBe("6:12");
    expect(clockOf(4 * 3_600_000)).toBeNull();
    expect(clockOf(0)).toBeNull();
  });

  it("estimates a set at the SAT's pace", () => {
    expect(minutesFor(8, "math")).toBe(13);
    expect(minutesFor(8, "reading")).toBe(9);
  });
});
