import { describe, expect, it } from "vitest";
import { nextRoutingState, route, TapClassifier, type PointerSample, type RoutingState } from "./routing";

const base: RoutingState = { pencilOn: false, penSeen: false, activePenId: null, screenReaderTouch: false };
const sample = (over: Partial<PointerSample>): PointerSample => ({
  kind: "touch",
  id: 1,
  width: 10,
  height: 10,
  touchCount: 1,
  ...over,
});

describe("route", () => {
  it("a pen always draws, pencil on or off", () => {
    expect(route(base, sample({ kind: "pen" }))).toBe("draw");
    expect(route({ ...base, pencilOn: true }, sample({ kind: "pen" }))).toBe("draw");
  });
  it("one finger draws only with the pencil on and no pen seen", () => {
    expect(route(base, sample({}))).toBe("native");
    expect(route({ ...base, pencilOn: true }, sample({}))).toBe("draw");
  });
  it("two fingers always scroll", () => {
    expect(route({ ...base, pencilOn: true }, sample({ touchCount: 2 }))).toBe("native");
  });
  it("after a pen is seen, fingers never draw (palm rejection)", () => {
    expect(route({ ...base, pencilOn: true, penSeen: true }, sample({}))).toBe("native");
  });
  it("a large contact never draws", () => {
    expect(route({ ...base, pencilOn: true }, sample({ width: 41 }))).toBe("native");
  });
  it("a touch during an active pen stroke never draws", () => {
    expect(route({ ...base, pencilOn: true, activePenId: 7 }, sample({}))).toBe("native");
  });
  it("a mouse draws only with the pencil on", () => {
    expect(route(base, sample({ kind: "mouse" }))).toBe("native");
    expect(route({ ...base, pencilOn: true }, sample({ kind: "mouse" }))).toBe("draw");
  });
  it("finger drawing is off while a screen reader owns touch", () => {
    expect(route({ ...base, pencilOn: true, screenReaderTouch: true }, sample({}))).toBe("native");
  });
  it("any pen marks the pen as seen", () => {
    expect(nextRoutingState(base, sample({ kind: "pen" })).penSeen).toBe(true);
    expect(nextRoutingState(base, sample({})).penSeen).toBe(false);
  });
});

describe("TapClassifier", () => {
  it("a short, still press is a tap", () => {
    const c = new TapClassifier();
    c.down(0, 0, 0);
    expect(c.move(5, 0)).toBe("pending");
    expect(c.up(249)).toBe("tap");
  });
  it("moving 6 px makes a stroke", () => {
    const c = new TapClassifier();
    c.down(0, 0, 0);
    expect(c.move(6, 0)).toBe("stroke");
    expect(c.up(100)).toBe("stroke");
  });
  it("holding past 250 ms makes a stroke", () => {
    const c = new TapClassifier();
    c.down(0, 0, 0);
    expect(c.up(251)).toBe("stroke");
  });
});
