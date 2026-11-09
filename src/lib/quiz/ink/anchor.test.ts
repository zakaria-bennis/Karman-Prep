import { describe, expect, it } from "vitest";
import { toAnchored, toPane, type AnchorLayout } from "./anchor";
import type { InkStroke } from "./types";

const layoutWith = (over: Partial<AnchorLayout> = {}): AnchorLayout => ({
  figure: () => null,
  char: () => ({ left: 100, top: 40, em: 16 }),
  choice: () => null,
  block: () => null,
  ...over,
});
const stroke = (anchored: ReturnType<typeof toAnchored>): InkStroke => ({
  id: 1,
  pen: 1,
  ...anchored,
});
const screen = [
  { x: 110, y: 50 },
  { x: 150, y: 70 },
];

describe("anchoring", () => {
  it("round-trips text ink in place", () => {
    const layout = layoutWith();
    const placed = toPane(
      stroke(toAnchored({ kind: "text", blockId: "p", charOffset: 12 }, layout, screen)),
      layout
    )!;
    placed.forEach((p, i) => {
      expect(p.x).toBeCloseTo(screen[i].x, 2);
      expect(p.y).toBeCloseTo(screen[i].y, 2);
    });
  });
  it("moves with its character when text rewraps", () => {
    const s = stroke(
      toAnchored({ kind: "text", blockId: "p", charOffset: 12 }, layoutWith(), screen)
    );
    const placed = toPane(s, layoutWith({ char: () => ({ left: 20, top: 200, em: 16 }) }))!;
    expect(placed[0]).toEqual({ x: 30, y: 210 });
    expect(placed[1]).toEqual({ x: 70, y: 230 });
  });
  it("scales with text size", () => {
    const s = stroke(
      toAnchored({ kind: "text", blockId: "p", charOffset: 12 }, layoutWith(), screen)
    );
    const placed = toPane(s, layoutWith({ char: () => ({ left: 100, top: 40, em: 24 }) }))!;
    expect(placed[1].x).toBeCloseTo(100 + 50 * 1.5, 5);
    expect(placed[1].y).toBeCloseTo(40 + 30 * 1.5, 5);
  });
  it("maps figure ink through the figure's scale", () => {
    const fig = { left: 0, top: 0, scaleX: 2, scaleY: 2 };
    const s = stroke(
      toAnchored({ kind: "figure", figureId: "f" }, layoutWith({ figure: () => fig }), [
        { x: 40, y: 20 },
      ])
    );
    expect(s.points[0]).toMatchObject({ x: 20, y: 10 });
    const placed = toPane(
      s,
      layoutWith({ figure: () => ({ left: 10, top: 10, scaleX: 3, scaleY: 3 }) })
    )!;
    expect(placed[0]).toEqual({ x: 70, y: 40 });
  });
  it("keeps pressure on stored points", () => {
    const s = stroke(
      toAnchored({ kind: "text", blockId: "p", charOffset: 1 }, layoutWith(), [
        { x: 100, y: 40, p: 0.7 },
      ])
    );
    expect(s.points[0].p).toBe(0.7);
  });
  it("returns null when the anchor no longer resolves", () => {
    const s = stroke(
      toAnchored(
        { kind: "choice", letter: "C" },
        layoutWith({ choice: () => ({ left: 0, top: 0, em: 16 }) }),
        screen
      )
    );
    expect(toPane(s, layoutWith())).toBeNull();
  });
});
