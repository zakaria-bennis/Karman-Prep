import { describe, expect, it } from "vitest";
import { dayKey, streaks } from "./streak";

const days = (...keys: string[]) => keys;

describe("study streak", () => {
  it("is zero with no practice", () => {
    expect(streaks([], "2026-11-08")).toEqual({ current: 0, longest: 0 });
  });

  it("counts days in a row, and today without practice yet doesn't break it", () => {
    const d = days("2026-11-05", "2026-11-06", "2026-11-07");
    expect(streaks(d, "2026-11-08").current).toBe(3);
    expect(streaks([...d, "2026-11-08"], "2026-11-08").current).toBe(4);
  });

  it("forgives one rest day a week, not two", () => {
    const oneRest = days("2026-11-03", "2026-11-04", "2026-11-06", "2026-11-07", "2026-11-08");
    expect(streaks(oneRest, "2026-11-08").current).toBe(5);
    const twoRests = days("2026-11-02", "2026-11-04", "2026-11-06", "2026-11-07", "2026-11-08");
    expect(streaks(twoRests, "2026-11-08").current).toBe(4);
  });

  it("ends after two missed days in a row", () => {
    expect(streaks(days("2026-11-01", "2026-11-02"), "2026-11-08").current).toBe(0);
  });

  it("keeps the longest streak", () => {
    const d = days("2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-11-08");
    expect(streaks(d, "2026-11-08")).toEqual({ current: 1, longest: 4 });
  });

  it("reads days in Central time", () => {
    expect(dayKey("2026-11-08T03:00:00Z")).toBe("2026-11-07");
  });
});
