import { describe, expect, it } from "vitest";
import { enclosedBadge } from "./closed-stroke";

const badge = { left: 90, top: 90, width: 20, height: 20 };
const circle = (gapDeg: number) =>
  Array.from({ length: 73 }, (_, i) => {
    const a = ((i * (360 - gapDeg)) / 72) * (Math.PI / 180);
    return { x: 100 + 25 * Math.cos(a), y: 100 + 25 * Math.sin(a) };
  });

describe("enclosedBadge", () => {
  it("a circle around the badge counts", () => {
    expect(enclosedBadge(circle(10), badge)).toBe(true);
  });
  it("an open C shape does not", () => {
    expect(enclosedBadge(circle(120), badge)).toBe(false);
  });
  it("a circle elsewhere does not", () => {
    expect(enclosedBadge(circle(10), { left: 300, top: 300, width: 20, height: 20 })).toBe(false);
  });
});
