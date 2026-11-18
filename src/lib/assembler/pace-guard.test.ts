import { describe, expect, it } from "vitest";
import { PACE, overPace } from "./pace-guard";

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
});
