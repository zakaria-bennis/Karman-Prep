import { describe, expect, it } from "vitest";
import { eraseInk, type InkStroke } from "./ink";
const strokes: InkStroke[] = [
  { id: 1, color: "red", points: [0, 10, 20, 30, 40, 50].map((x) => ({ x, y: 0 })) },
  {
    id: 2,
    color: "blue",
    points: [
      { x: 0, y: 100 },
      { x: 50, y: 100 },
    ],
  },
];
describe("scratchpad erasers", () => {
  it("removes a touched stroke without clearing others", () => {
    expect(eraseInk(strokes, { x: 25, y: 1 }, 3, true).map((s) => s.id)).toEqual([2]);
  });
  it("splits only touched segments for precision erasing", () => {
    const result = eraseInk(strokes, { x: 25, y: 1 }, 3, false);
    expect(result).toHaveLength(3);
    expect(result[0].points.at(-1)?.x).toBe(20);
    expect(result[1].points[0].x).toBe(40);
    expect(result[2]).toBe(strokes[1]);
  });
});
