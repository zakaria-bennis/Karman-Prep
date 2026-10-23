import { describe, it, expect } from "vitest";
import { figureAlignOffset, toColumnY } from "./use-figure-stem-align";

describe("figure-to-text alignment", () => {
  it("moves a shorter figure down to the text's last line, never a taller one up", () => {
    expect(figureAlignOffset(300, 340)).toBe(40);
    expect(figureAlignOffset(400, 340)).toBe(0);
  });

  it("measures in CSS pixels when the screen is drawn scaled down", () => {
    // A 1280px screen shown at 60%: 60 drawn pixels below the column top are 100 CSS pixels.
    expect(toColumnY(160, 100, 480, 800, 0)).toBeCloseTo(100);
    expect(toColumnY(160, 100, 800, 800, 20)).toBeCloseTo(80);
    // The margin computed from scaled measurements matches the unscaled one.
    const unscaled = figureAlignOffset(
      toColumnY(350, 0, 800, 800, 0),
      toColumnY(390, 0, 800, 800, 0)
    );
    const scaled = figureAlignOffset(
      toColumnY(210, 0, 480, 800, 0),
      toColumnY(234, 0, 480, 800, 0)
    );
    expect(scaled).toBe(unscaled);
  });
});
