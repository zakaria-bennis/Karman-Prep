import { describe, expect, it } from "vitest";
import { FREEZES, PACE, overPace } from "./pace-guard";

describe("the pace a person can keep", () => {
  it("lets a quick student through", () => {
    // ten answers in a minute is six seconds each: fast, and human
    expect(overPace(10, PACE.answers)).toBe(false);
    expect(overPace(PACE.answers - 1, PACE.answers)).toBe(false);
  });
  it("stops the one after the limit", () => {
    expect(overPace(PACE.answers, PACE.answers)).toBe(true);
    expect(overPace(PACE.starts, PACE.starts)).toBe(true);
  });
  it("sits well above any honest pace: three seconds a question, sustained for a minute", () => {
    expect(PACE.windowMs / PACE.answers).toBeLessThanOrEqual(3000);
  });
  it("freezes for longer only at a pace no student holds: under 15 seconds a question", () => {
    for (const step of FREEZES) {
      expect(step.windowMs / step.answers).toBeLessThan(15_000);
      // and a longer step never asks for a quicker pace than a shorter one
      expect(step.windowMs).toBeGreaterThan(PACE.windowMs);
    }
    // a quick, honest student: a question every 20 seconds for an hour
    expect(overPace(180, FREEZES[1].answers)).toBe(false);
  });
});
