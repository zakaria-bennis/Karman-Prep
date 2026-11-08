import { describe, expect, it } from "vitest";
import { coursePercent } from "./progress-rules";

describe("course percent", () => {
  it("is the share of the way to Conquered across every skill", () => {
    expect(coursePercent([0, 0, 0, 0])).toBe(0);
    expect(coursePercent([4, 4, 0, 0])).toBe(50);
    expect(coursePercent([1, 2, 3, 4])).toBe(63);
    expect(coursePercent([])).toBe(0);
  });
});
