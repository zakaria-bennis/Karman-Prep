import { describe, expect, it } from "vitest";
import { modeFor } from "./mode";

describe("modeFor", () => {
  it("skill practice grades instantly with a count-up clock", () => {
    expect(modeFor("skill", { hasTutor: false })).toEqual({
      grading: "instant",
      clock: { kind: "up" },
      markForReview: false,
      showTutorFlag: false,
      canBookmark: true,
    });
  });
  it("the diagnostic grades at the end with a countdown and review marks", () => {
    const mode = modeFor("diagnostic", { baseSeconds: 1920, hasTutor: true });
    expect(mode.grading).toBe("end");
    expect(mode.clock).toEqual({ kind: "down", baseSeconds: 1920 });
    expect(mode.markForReview).toBe(true);
    expect(mode.showTutorFlag).toBe(true);
  });
  it("admin preview is locked, clockless and cannot bookmark", () => {
    const mode = modeFor("preview", { hasTutor: true });
    expect(mode.grading).toBe("locked");
    expect(mode.clock.kind).toBe("none");
    expect(mode.canBookmark).toBe(false);
    expect(mode.showTutorFlag).toBe(false);
  });
  it("a countdown host without a base time is rejected", () => {
    expect(() => modeFor("timed", { hasTutor: false })).toThrow(/baseSeconds/);
  });
});
