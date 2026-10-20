import { describe, expect, it } from "vitest";
import { clampListWidth, defaultListWidth, snapSquare } from "./ListResizer";

describe("list width snap to a square graph", () => {
  it("snaps a dragged width within 10 px of the square width (1440 x 854)", () => {
    // The pointer at 600 with a 4 px grab offset asks for 596; the square graph needs 586.
    expect(snapSquare(clampListWidth(596, 1440), 1440, 854)).toBe(586);
    expect(snapSquare(clampListWidth(496, 1440), 1440, 854)).toBe(496);
    expect(snapSquare(clampListWidth(696, 1440), 1440, 854)).toBe(696);
  });

  it("snaps the default width too", () => {
    expect(defaultListWidth(1000)).toBe(360);
    expect(snapSquare(defaultListWidth(1000), 1000, 650)).toBe(350);
    expect(snapSquare(defaultListWidth(900), 900, 560)).toBe(340);
  });

  it("leaves the width alone without a known graph height", () => {
    expect(snapSquare(360, 1000, Infinity)).toBe(360);
  });
});
